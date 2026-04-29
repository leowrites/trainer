const React = require('react');
const ReactNative = require('react-native');

const TrueSheet = React.forwardRef(function MockTrueSheet(
  { children, footer, onDidDismiss, onDidPresent },
  ref,
) {
  React.useImperativeHandle(ref, () => ({
    present: async () => {
      onDidPresent?.();
    },
    dismiss: async () => {
      onDidDismiss?.();
    },
  }));

  return React.createElement(
    ReactNative.View,
    null,
    children,
    footer ?? null,
  );
});

module.exports = {
  TrueSheet,
};
