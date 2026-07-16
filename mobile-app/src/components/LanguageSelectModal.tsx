import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../hooks/useLanguage';
import type { AppLanguage } from '../i18n';

// Shown once after first login (when the user has no saved language yet), and
// reusable anywhere a language picker is needed.
export default function LanguageSelectModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { current, change } = useLanguage();

  const pick = async (lang: AppLanguage) => {
    await change(lang);
    onClose();
  };

  const Option = ({ lang, label }: { lang: AppLanguage; label: string }) => {
    const active = current === lang;
    return (
      <TouchableOpacity
        onPress={() => pick(lang)}
        style={[
          styles.option,
          { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' },
        ]}
      >
        <Text style={[styles.optionText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bgElevated }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('language.modalTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted ?? colors.text }]}>
            {t('language.modalSubtitle')}
          </Text>
          <Option lang="en" label="English" />
          <Option lang="hi" label="हिंदी" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 20, padding: 22 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13.5, marginBottom: 18, opacity: 0.8 },
  option: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  optionText: { fontSize: 16, fontWeight: '700' },
});
