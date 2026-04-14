const fs = require('fs');

const configPath = 'src/components/PanelPrincipal/ReminderCard.jsx';
let content = fs.readFileSync(configPath, 'utf8');

// replace export default function ReminderCard with const ReminderCard = function
content = content.replace(/export default function ReminderCard\(\{/, 'const ReminderCard = ({');

// append the export
content += '\n\nexport default React.memo(ReminderCard);\n';

fs.writeFileSync(configPath, content);
