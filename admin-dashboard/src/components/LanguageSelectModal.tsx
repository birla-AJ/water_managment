import { Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import type { AppLanguage } from '../i18n';

// Shown once after first login (when the user has no saved language yet).
export default function LanguageSelectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { current, change } = useLanguage();

  const pick = async (lang: AppLanguage) => {
    await change(lang);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('language.modalTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('language.modalSubtitle')}
        </Typography>
        <Stack spacing={1.5}>
          <Button
            size="large"
            variant={current === 'en' ? 'contained' : 'outlined'}
            onClick={() => pick('en')}
          >
            English
          </Button>
          <Button
            size="large"
            variant={current === 'hi' ? 'contained' : 'outlined'}
            onClick={() => pick('hi')}
          >
            हिंदी
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
