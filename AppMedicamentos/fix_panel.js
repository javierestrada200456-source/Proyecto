const fs = require('fs');

const configPath = 'src/components/PanelPrincipal/PanelPrincipal.jsx';
let content = fs.readFileSync(configPath, 'utf8');

// Replace pending reminders map
const regexPending = /<ScrollView showsVerticalScrollIndicator=\{false\}>\s*\{pendingReminders\.length === 0 \? \([\s\S]*?\) : \([\s\S]*?pendingReminders\.map\(\(reminder, index\) => \([\s\S]*?\}\)[\s\S]*?\)[\s\S]*?\}\s*<\/ScrollView>/;

const replacePending = `<FlatList
                      data={pendingReminders}
                      keyExtractor={(item, index) => index.toString()}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={() => (
                          <Text style={{ textAlign: 'center', color: isDark ? theme.textSecondary : '#666', marginVertical: 20 }}>
                              No hay recordatorios pendientes en este momento.
                          </Text>
                      )}
                      renderItem={({ item: reminder, index }) => (
                          <View style={{
                              padding: 15,
                              marginBottom: 10,
                              borderRadius: 12,
                              backgroundColor: isDark ? '#2d3748' : '#f7fafc',
                          }}>
                              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? theme.text : '#333' }}>
                                  {reminder.medName}
                              </Text>
                              <Text style={{ fontSize: 14, color: isDark ? theme.textSecondary : '#666', marginTop: 4 }}>
                                  Gestiona este recordatorio en la sección Alarmas
                              </Text>
                          </View>
                      )}
                    />`;

content = content.replace(regexPending, replacePending);

// Replace history map
const regexHistory = /<ScrollView showsVerticalScrollIndicator=\{false\}>\s*\{historyEntries\.length === 0 \? \([\s\S]*?\) : \([\s\S]*?historyEntries\.map\(\(entry\) => \{\s*(?:const dateStr[\s\S]*?)(?:const timeStr[\s\S]*?)(?:const statusColor[\s\S]*?)(?:const statusIcon[\s\S]*?)return \([\s\S]*?\);\s*\}\)\s*\)\s*\}\s*<\/ScrollView>/;

const replaceHistory = `<FlatList
                  data={historyEntries}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={() => (
                    <Text style={{ textAlign: 'center', color: isDark ? theme.textSecondary : '#666', marginVertical: 30, fontSize: 15 }}>
                      Aún no has aceptado ninguna dosis.
                    </Text>
                  )}
                  renderItem={({ item: entry }) => {
                    const dateStr = entry.takenAt ? new Date(entry.takenAt).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
                    const timeStr = entry.takenAt ? new Date(entry.takenAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
                    const statusColor = entry.status === 'taken' ? (isDark ? '#4ade80' : '#38a169') : (isDark ? '#f87171' : '#e53e3e');
                    const statusIcon = entry.status === 'taken' ? "checkmark-circle" : "close-circle";
                    return (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 15,
                        marginBottom: 12,
                        borderRadius: 16,
                        backgroundColor: isDark ? '#2d3748' : '#f8fafc',
                        borderLeftWidth: 4,
                        borderLeftColor: statusColor,
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 17, fontWeight: 'bold', color: isDark ? theme.text : '#2d3748', marginBottom: 2 }}>
                            {entry.medName}
                          </Text>
                          <Text style={{ fontSize: 13, color: isDark ? '#a0aec0' : '#718096' }}>
                            {dateStr} a las {timeStr}
                          </Text>
                        </View>
                        <Ionicons name={statusIcon} size={28} color={statusColor} />
                      </View>
                    );
                  }}
                />`;

content = content.replace(regexHistory, replaceHistory);

fs.writeFileSync(configPath, content);
