import fs from 'fs';
const path = 'c:\\Users\\USER\\OneDrive\\Documentos\\Proyecto\\AppMedicamentos\\src\\components\\PanelPrincipal\\AlarmaYRecordatorio\\AlarmOverlay.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import AlarmScreen from './AlarmScreen';",
  "import AlarmScreen from './AlarmScreen';\nimport { notifyCaregivers } from '../../../services/CaregiverNotifications';"
);

content = content.replace(
  `          await AsyncStorage.setItem(STORAGE_LAST_TAKEN_KEY, JSON.stringify(map));
        } catch (_e) { /* noop */ }
      }
    };`,
  `          await AsyncStorage.setItem(STORAGE_LAST_TAKEN_KEY, JSON.stringify(map));\n          \n          notifyCaregivers('✅ [Nombre del paciente] se tomó su dosis', '[Nombre del paciente] se acaba de tomar su dosis de [Nombre del medicamento]', notification.data || {});\n        } catch (_e) { /* noop */ }\n      }\n    };`
);
fs.writeFileSync(path, content);
