import Foundation
import HealthKit
import React

@objc(TrainerHealthKit)
final class TrainerHealthKit: NSObject {
  private let healthStore = HKHealthStore()

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(isHealthKitAvailable:rejecter:)
  func isHealthKitAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(HKHealthStore.isHealthDataAvailable())
  }

  @objc(getAuthorizationSnapshot:rejecter:)
  func getAuthorizationSnapshot(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(snapshotPayload())
  }

  @objc(requestReadAuthorization:rejecter:)
  func requestReadAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("healthkit_unavailable", "HealthKit is not available on this device.", nil)
      return
    }

    guard let readTypes = requestableReadTypes() else {
      reject("healthkit_missing_types", "Required HealthKit quantity types are unavailable.", nil)
      return
    }

    healthStore.requestAuthorization(toShare: nil, read: readTypes) { [weak self] _, error in
      if let error {
        self?.finishOnMain {
          reject("healthkit_authorization_failed", error.localizedDescription, error)
        }
        return
      }

      self?.finishOnMain {
        let payload = self?.snapshotPayload() ?? self?.fallbackSnapshotPayload() ?? [:]
        resolve(payload)
      }
    }
  }

  @objc(fetchHealthData:resolver:rejecter:)
  func fetchHealthData(
    _ request: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("healthkit_unavailable", "HealthKit is not available on this device.", nil)
      return
    }

    do {
      let fetchRequest = try parseFetchRequest(request)
      queryBodyWeightSamples(
        from: fetchRequest.fromDate,
        to: fetchRequest.toDate
      ) { [weak self] bodyWeightResult in
        switch bodyWeightResult {
        case .failure(let error):
          self?.finishOnMain {
            reject("healthkit_query_failed", error.localizedDescription, error)
          }
        case .success(let bodyWeightSamples):
          self?.queryStepDailyTotals(
            from: fetchRequest.fromDate,
            to: fetchRequest.toDate
          ) { [weak self] stepResult in
            switch stepResult {
            case .failure(let error):
              self?.finishOnMain {
                reject("healthkit_query_failed", error.localizedDescription, error)
              }
            case .success(let stepDailyTotals):
              self?.finishOnMain {
                resolve([
                  "bodyWeightSamples": bodyWeightSamples,
                  "stepDailyTotals": stepDailyTotals,
                ])
              }
            }
          }
        }
      }
    } catch {
      reject("healthkit_invalid_arguments", error.localizedDescription, error)
    }
  }
}

private extension TrainerHealthKit {
  struct FetchRequest {
    let fromDate: Date
    let toDate: Date
  }

  func snapshotPayload() -> [String: Any] {
    guard HKHealthStore.isHealthDataAvailable() else {
      return fallbackSnapshotPayload()
    }

    return [
      "available": true,
      "bodyWeightReadStatus": authorizationStatusString(for: bodyMassType()),
      "stepCountReadStatus": authorizationStatusString(for: stepCountType()),
    ]
  }

  func fallbackSnapshotPayload() -> [String: Any] {
    [
      "available": false,
      "bodyWeightReadStatus": "unavailable",
      "stepCountReadStatus": "unavailable",
    ]
  }

  func authorizationStatusString(for type: HKQuantityType?) -> String {
    guard let type else {
      return "unavailable"
    }

    switch healthStore.authorizationStatus(for: type) {
    case .notDetermined:
      return "not_determined"
    case .sharingDenied:
      return "sharing_denied"
    case .sharingAuthorized:
      return "sharing_authorized"
    @unknown default:
      return "sharing_restricted"
    }
  }

  func requestableReadTypes() -> Set<HKObjectType>? {
    let types = [bodyMassType(), stepCountType()].compactMap { $0 }

    guard !types.isEmpty else {
      return nil
    }

    return Set(types)
  }

  func bodyMassType() -> HKQuantityType? {
    HKObjectType.quantityType(forIdentifier: .bodyMass)
  }

  func stepCountType() -> HKQuantityType? {
    HKObjectType.quantityType(forIdentifier: .stepCount)
  }

  func parseFetchRequest(_ request: NSDictionary) throws -> FetchRequest {
    guard let fromValue = request["fromTimestamp"] as? NSNumber,
          let toValue = request["toTimestamp"] as? NSNumber else {
      throw NSError(
        domain: "TrainerHealthKit",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "fromTimestamp and toTimestamp are required."]
      )
    }

    let fromMilliseconds = fromValue.doubleValue
    let toMilliseconds = toValue.doubleValue

    guard fromMilliseconds.isFinite, toMilliseconds.isFinite else {
      throw NSError(
        domain: "TrainerHealthKit",
        code: 2,
        userInfo: [NSLocalizedDescriptionKey: "fromTimestamp and toTimestamp must be finite numbers."]
      )
    }

    guard toMilliseconds >= fromMilliseconds else {
      throw NSError(
        domain: "TrainerHealthKit",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "toTimestamp must be greater than or equal to fromTimestamp."]
      )
    }

    return FetchRequest(
      fromDate: Date(timeIntervalSince1970: fromMilliseconds / 1000.0),
      toDate: Date(timeIntervalSince1970: toMilliseconds / 1000.0)
    )
  }

  func queryBodyWeightSamples(
    from fromDate: Date,
    to toDate: Date,
    completion: @escaping (Result<[[String: Any]], Error>) -> Void
  ) {
    guard let bodyMassType = bodyMassType() else {
      completion(.success([]))
      return
    }

    guard isAuthorizedToRead(quantityType: bodyMassType) else {
      completion(.success([]))
      return
    }

    let predicate = HKQuery.predicateForSamples(
      withStart: fromDate,
      end: toDate.addingTimeInterval(0.001),
      options: [.strictStartDate, .strictEndDate]
    )

    let sortDescriptors = [
      NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true),
      NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: true),
    ]

    let query = HKSampleQuery(
      sampleType: bodyMassType,
      predicate: predicate,
      limit: HKObjectQueryNoLimit,
      sortDescriptors: sortDescriptors
    ) { _, samples, error in
      if let error {
        completion(.failure(error))
        return
      }

      guard let self else {
        completion(.success([]))
        return
      }

      let mappedSamples = (samples as? [HKQuantitySample] ?? []).map { self.mapBodyWeightSample($0) }
      completion(.success(mappedSamples))
    }

    healthStore.execute(query)
  }

  func queryStepDailyTotals(
    from fromDate: Date,
    to toDate: Date,
    completion: @escaping (Result<[[String: Any]], Error>) -> Void
  ) {
    guard let stepType = stepCountType() else {
      completion(.success([]))
      return
    }

    guard isAuthorizedToRead(quantityType: stepType) else {
      completion(.success([]))
      return
    }

    let calendar = Calendar.current
    let startOfFirstDay = calendar.startOfDay(for: fromDate)
    let endOfLastDay = calendar.startOfDay(for: toDate)

    guard let endBoundary = calendar.date(byAdding: .day, value: 1, to: endOfLastDay) else {
      completion(.failure(NSError(
        domain: "TrainerHealthKit",
        code: 4,
        userInfo: [NSLocalizedDescriptionKey: "Unable to calculate the final step bucket boundary."]
      )))
      return
    }

    let predicate = HKQuery.predicateForSamples(
      withStart: startOfFirstDay,
      end: endBoundary,
      options: [.strictStartDate, .strictEndDate]
    )

    let query = HKStatisticsCollectionQuery(
      quantityType: stepType,
      quantitySamplePredicate: predicate,
      options: .cumulativeSum,
      anchorDate: startOfFirstDay,
      intervalComponents: DateComponents(day: 1)
    ) { _, collection, error in
      if let error {
        completion(.failure(error))
        return
      }

      guard let collection else {
        completion(.success([]))
        return
      }

      guard let self else {
        completion(.success([]))
        return
      }

      var payload: [[String: Any]] = []
      collection.enumerateStatistics(from: startOfFirstDay, to: endBoundary) { statistics, _ in
        let stepValue = statistics.sumQuantity()?.doubleValue(for: .count()) ?? 0
        payload.append([
          "dayStartTimestamp": self.milliseconds(for: statistics.startDate),
          "stepCount": Int(stepValue.rounded(.toNearestOrAwayFromZero)),
        ])
      }

      completion(.success(payload))
    }

    healthStore.execute(query)
  }

  func mapBodyWeightSample(_ sample: HKQuantitySample) -> [String: Any] {
    let sourceRevision = sample.sourceRevision
    let source = sourceRevision.source
    let metadata = sample.metadata ?? [:]
    let sourceVersion = sourceRevision.version
    let sourceVersionPayload: Any = {
      guard let sourceVersion else {
        return NSNull()
      }

      return sourceVersion.isEmpty ? NSNull() : sourceVersion
    }()
    let wasUserEntered =
      (metadata[HKMetadataKeyWasUserEntered] as? NSNumber)?.boolValue
      ?? (metadata[HKMetadataKeyWasUserEntered] as? Bool)
      ?? false

    return [
      "uuid": sample.uuid.uuidString,
      "weight": sample.quantity.doubleValue(for: HKUnit.gramUnit(with: .kilo)),
      "unit": "kg",
      "startTimestamp": self.milliseconds(for: sample.startDate),
      "endTimestamp": self.milliseconds(for: sample.endDate),
      "sourceBundleIdentifier": source.bundleIdentifier,
      "sourceName": source.name,
      "sourceVersion": sourceVersionPayload,
      "wasUserEntered": wasUserEntered,
    ]
  }

  func isAuthorizedToRead(quantityType: HKQuantityType) -> Bool {
    healthStore.authorizationStatus(for: quantityType) == .sharingAuthorized
  }

  func milliseconds(for date: Date) -> NSNumber {
    NSNumber(value: Int64((date.timeIntervalSince1970 * 1000.0).rounded()))
  }

  func finishOnMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread {
      work()
      return
    }

    DispatchQueue.main.async(execute: work)
  }
}
