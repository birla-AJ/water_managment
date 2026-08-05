import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import type { AppColors } from '../theme/colors';

const SUPPORT_PHONE = '18001234567';
const SUPPORT_EMAIL = 'support@waterflow.com';
const SUPPORT_WHATSAPP = '918001234567';

export default function SupportScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const rows = [
    { icon: 'phone', label: t('support.callUs'), value: SUPPORT_PHONE, action: () => Linking.openURL(`tel:${SUPPORT_PHONE}`) },
    { icon: 'whatsapp', label: t('support.whatsapp'), value: `+${SUPPORT_WHATSAPP}`, action: () => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`) },
    { icon: 'email', label: t('support.email'), value: SUPPORT_EMAIL, action: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
  ];

  return (
    <View style={styles.container}>
      <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
        <View style={styles.heroIcon}>
          <Icon name="headset" size={44} color={colors.primary} />
        </View>
        <Text style={styles.title}>{t('support.title')}</Text>
        <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
      </Card>
      {rows.map((r) => (
        <TouchableOpacity key={r.label} activeOpacity={0.8} onPress={r.action}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.rowIcon}>
              <Icon name={r.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.value}>{r.value}</Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.textMuted} />
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
    heroIcon: {
      width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary + '1F',
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 12 },
    subtitle: { color: colors.textMuted, marginTop: 4 },
    rowIcon: {
      width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary + '1F',
    },
    label: { fontWeight: '800', color: colors.text },
    value: { color: colors.textMuted, marginTop: 2 },
  });
