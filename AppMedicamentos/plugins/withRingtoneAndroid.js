const {
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withRingtoneAndroid = (config) => {
  // 1. Copiar archivos nativos Kotlin
  config = withDangerousMod(config, [
    "android",
    async (configMod) => {
      const androidPackage =
        config.android?.package || "com.javierestrada.appmedicamentos";
      const packagePath = androidPackage.replace(/\./g, "/");

      const sourceDir = path.join(
        configMod.modRequest.projectRoot,
        "native-code"
      );
      const destDir = path.join(
        configMod.modRequest.platformProjectRoot,
        "app/src/main/java",
        packagePath
      );

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const files = ["RingtoneModule.kt", "RingtonePackage.kt"];

      files.forEach((file) => {
        const sourceFile = path.join(sourceDir, file);
        const destFile = path.join(destDir, file);

        if (fs.existsSync(sourceFile)) {
          let content = fs.readFileSync(sourceFile, "utf-8");
          content = content.replace(
            /package com\.firexsuprem\.AppMedicamentos/g,
            `package ${androidPackage}`
          );
          fs.writeFileSync(destFile, content);
        } else {
          console.warn(`Warning: Native file not found: ${sourceFile}`);
        }
      });

      return configMod;
    },
  ]);

  // 2. Registrar el Package en MainApplication.kt
  config = withMainApplication(config, (configMod) => {
    let mainApplication = configMod.modResults.contents;

    if (!mainApplication.includes("packages.add(RingtonePackage())")) {
      const packageSearch = /PackageList\(this\)\.packages\.apply\s*{/;
      if (mainApplication.match(packageSearch)) {
        mainApplication = mainApplication.replace(
          packageSearch,
          `PackageList(this).packages.apply {\n            add(RingtonePackage())`
        );
      }
    }

    configMod.modResults.contents = mainApplication;
    return configMod;
  });

  return config;
};

module.exports = withRingtoneAndroid;
