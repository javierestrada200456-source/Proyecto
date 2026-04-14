const fs = require('fs');

const configPath = 'src/components/PanelPrincipal/AlarmaYRecordatorio/AlarmaYRecordatorio.jsx';
let content = fs.readFileSync(configPath, 'utf8');

const regex = /<ScrollView(?:[^>]*)>[\s\S]*?(?:\{activeTab === 'alarmas' \? \([\s\S]*?)<\/ScrollView>/;

const replacement = `        {activeTab === 'alarmas' ? (
          <FlatList
            data={alarms}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scrollBottomPadding, flexGrow: 1 }
            ]}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Animatable.View animation="fadeIn" style={styles.emptyStateTransparent}>
                <Ionicons name="alarm-outline" size={80} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateTextTransparent}>No tienes alarmas configuradas</Text>
              </Animatable.View>
            )}
            renderItem={({ item: alarm, index }) => (
                <Animatable.View
                  key={alarm.id}
                  animation="fadeInUp"
                  delay={index * 100 > 1000 ? 0 : index * 100}
                  style={[styles.alarmCard, !alarm.active && styles.alarmCardNoShadow]} 
                >
                  <LinearGradient
                    colors={alarm.active ? (isDark ? ['#2d3748', '#1a202c'] : ['rgba(255,255,255,0.98)','rgba(235,238,255,0.95)']) : (isDark ? ['#1a202c', '#171923'] : ['rgba(255,255,255,0.5)','rgba(230,230,240,0.3)'])}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.alarmCardGradient, !alarm.active && styles.alarmCardInactive, isDark && {borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)'}]}
                  >
                    <View style={styles.alarmInfo}>
                      <View style={styles.timeRow}>
                        <Text style={[styles.alarmTime, !alarm.active && styles.mutedText, isDark && {color: '#fff'}]}>
                          {Array.isArray(alarm.times) && alarm.times.length > 0 
                            ? alarm.times.map(t => \`\${String(t.hour).padStart(2,'0')}:\${String(t.minute).padStart(2,'0')}\`).join(' • ')
                            : \`\${alarm.hour}:\${alarm.minute}\`}
                        </Text>
                      </View>
                      <Text style={[styles.alarmMedName, !alarm.active && styles.mutedText, isDark && {color: '#e2e8f0'}]}>{alarm.medName}</Text>
                      <Text style={[styles.alarmDose, !alarm.active && styles.mutedText, isDark && {color: '#cbd5e1'}]}>
                        {alarm.medStrengthUnit ? \`\${alarm.medStrengthUnit.toUpperCase()}\` : ''}
                        {alarm.medStrength ? \` · \${alarm.medStrength}\` : ''}    
                      </Text>
                      <View style={styles.daysContainer}>
                        {Array.isArray(alarm.days) && alarm.days.length > 0 ? ( 
                           [...alarm.days]
                           .sort((a, b) => weekDays.findIndex(d => d.full === a) - weekDays.findIndex(d => d.full === b))
                           .map((day, idx) => (
                              <View key={idx} style={[styles.dayBadge, !alarm.active && styles.dayBadgeInactive, isDark && {backgroundColor: 'rgba(255,255,255,0.1)'}]}>
                                <Text style={[styles.dayBadgeText, !alarm.active && styles.dayBadgeTextInactive, isDark && {color: '#e2e8f0'}]}>
                                  {weekDayShort[day] || day}
                                </Text>
                              </View>
                           ))
                        ) : (
                          <Text style={[styles.alarmDose, !alarm.active && styles.mutedText, isDark && {color: '#cbd5e1'}]}>—</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.alarmActions}>
                      <AlarmToggle
                        value={alarm.active}
                        disabled={externalSyncActive || !!togglingById[alarm.id]}
                        onChange={(val) => handleToggleAlarm(alarm.id, val)}
                      />
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={[
                             styles.iconButton,
                            !alarm.active && styles.iconButtonInactive,
                            externalSyncActive && { opacity: 0.5 }
                          ]}
                          disabled={externalSyncActive}
                          onPress={() => handleEditAlarm(alarm)}
                        >
                          <Ionicons
                             name="pencil"
                             size={20}
                            color={!alarm.active ? "#7b7b8a" : "#667eea"}       
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                             styles.iconButton,
                             styles.iconButtonDelete,
                            !alarm.active && styles.iconButtonInactive,
                            externalSyncActive && { opacity: 0.5 }
                          ]}
                          disabled={externalSyncActive}
                          onPress={() => handleDeleteAlarm(alarm.id)}
                        >
                          <Ionicons
                             name="trash-outline"
                             size={20}
                             color={!alarm.active ? "#7b7b8a" : "#ff4444"}      
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </Animatable.View>
            )}
          />
        ) : (
          <FlatList
            data={visibleReminderIds.map(id => alarms.find(a => a.id === id)).filter(Boolean)}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scrollBottomPadding, flexGrow: 1 }
            ]}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Animatable.View animation="fadeIn" style={styles.emptyStateTransparent}>
                <Ionicons name="albums-outline" size={80} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateTextTransparent}>No tienes recordatorios configurados</Text>
              </Animatable.View>
            )}
            renderItem={({ item: alarm, index }) => (
              <Animatable.View
                key={alarm.id}
                animation="fadeInUp"
                delay={index * 100 > 1000 ? 0 : index * 100}
              >
                 <ReminderCard
                     alarm={alarm}
                     lastTaken={lastTakenMap[alarm.id]}
                     onDelete={() => handleRemoveVisibleReminder(alarm.id, 'delete')}
                 />
              </Animatable.View>
            )}
          />
        )}`;

content = content.replace(regex, replacement);
fs.writeFileSync(configPath, content);
