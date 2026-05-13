const {
  withAndroidColors,
  withAndroidStyles,
  AndroidConfig,
} = require("expo/config-plugins");

const COLOR_NAME = "app_window_background";

/**
 * Imposta `android:windowBackground` di AppTheme su un colore esplicito.
 *
 * Motivazione: su Android 12+ la nuova Splash Screen API mostra il
 * `windowSplashScreenBackground` durante lo splash, ma alla transizione verso
 * `postSplashScreenTheme` (= AppTheme) il sistema espone il `windowBackground`
 * del tema dell'app per qualche frame. Se AppTheme.windowBackground è il default
 * (bianco), si vede un bordo non uniforme attorno al logo prima che la View
 * React si monti. Forzandolo allo stesso beige dello splash, la transizione
 * appare continua.
 *
 * Plugin solo Android — non tocca iOS in alcun modo.
 */
module.exports = function withAndroidWindowBackground(config, props) {
  const color = (props && props.color) || "#F7DCB3";

  config = withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: COLOR_NAME,
      value: color,
    });
    return cfg;
  });

  config = withAndroidStyles(config, (cfg) => {
    cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: "android:windowBackground",
      value: `@color/${COLOR_NAME}`,
    });
    return cfg;
  });

  return config;
};
