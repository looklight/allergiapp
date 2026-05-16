const {
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
  AndroidConfig,
} = require("expo/config-plugins");

const COLOR_NAME = "app_window_background";

/**
 * Imposta `android:windowBackground` di AppTheme su un colore esplicito,
 * sia in light che in dark mode di sistema.
 *
 * Motivazione: su Android 12+ la nuova Splash Screen API mostra il
 * `windowSplashScreenBackground` durante lo splash, ma alla transizione verso
 * `postSplashScreenTheme` (= AppTheme) il sistema espone il `windowBackground`
 * del tema dell'app per qualche frame. AppTheme eredita da
 * `Theme.AppCompat.DayNight.NoActionBar`, quindi in night mode il default è
 * scuro → si vede un rettangolo crema dentro uno sfondo nero. La app non ha
 * dark mode (`userInterfaceStyle: "light"`), quindi forziamo lo stesso colore
 * in entrambe le modalità.
 *
 * Plugin solo Android — non tocca iOS in alcun modo.
 */
module.exports = function withAndroidWindowBackground(config, props) {
  const color = (props && props.color) || "#F7DCB3";

  const writeColor = (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: COLOR_NAME,
      value: color,
    });
    return cfg;
  };

  config = withAndroidColors(config, writeColor);
  config = withAndroidColorsNight(config, writeColor);

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
