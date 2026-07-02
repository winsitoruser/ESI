import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule;
};

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: ValidationSchema<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur
    if (validationSchema && validationSchema[field]) {
      const error = validateField(field, values[field], validationSchema[field]!);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  }, [values, validationSchema]);

  const validateField = (
    field: keyof T,
    value: any,
    rules: ValidationRule
  ): string | null => {
    if (rules.required && !value) {
      return `${String(field)} is required`;
    }

    if (rules.min !== undefined && value && value.length < rules.min) {
      return `${String(field)} must be at least ${rules.min} characters`;
    }

    if (rules.max !== undefined && value && value.length > rules.max) {
      return `${String(field)} must be at most ${rules.max} characters`;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      return `${String(field)} format is invalid`;
    }

    if (rules.custom) {
      return rules.custom(value);
    }

    return null;
  };

  const validate = useCallback((): boolean => {
    if (!validationSchema) return true;

    const validationErrors: Partial<Record<keyof T, string>> = {};

    Object.keys(validationSchema).forEach(key => {
      const field = key as keyof T;
      const rules = validationSchema[field];
      if (rules) {
        const error = validateField(field, values[field], rules);
        if (error) {
          validationErrors[field] = error;
        }
      }
    });

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [values, validationSchema]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void>) => {
      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce((acc, key) => {
        acc[key as keyof T] = true;
        return acc;
      }, {} as Partial<Record<keyof T, boolean>>);
      setTouched(allTouched);

      if (!validate()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error: any) {
        setErrors({ submit: error.message } as any);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    reset,
    setFieldValue,
    setFieldError,
    setErrors
  };
}
