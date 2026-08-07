import { forwardRef, useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

/**
 * A MUI TextField for passwords with a built-in show/hide toggle.
 * Forwards every prop (and ref) straight through to TextField, so it is a
 * drop-in replacement for `<TextField type="password" />` — works with both
 * controlled inputs and react-hook-form's `{...register(...)}` spread.
 */
const PasswordField = forwardRef<HTMLDivElement, TextFieldProps>(
  function PasswordField({ InputProps, ...rest }, ref) {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);
    return (
      <TextField
        {...rest}
        ref={ref}
        type={show ? 'text' : 'password'}
        InputProps={{
          ...InputProps,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={show ? t('common.hidePassword') : t('common.showPassword')}
                onClick={() => setShow((s) => !s)}
                edge="end"
                size="small"
                tabIndex={-1}
              >
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    );
  },
);

export default PasswordField;
