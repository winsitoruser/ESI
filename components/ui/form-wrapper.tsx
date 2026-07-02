import React, { ReactNode } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

/**
 * A component that provides form context without actually being a functional form
 * Use this to wrap components that use form fields but aren't actual forms
 */
interface FormWrapperProps {
  children: ReactNode;
}

export function FormWrapper({ children }: FormWrapperProps) {
  // Create a dummy form that doesn't do anything
  const methods = useForm();
  
  return (
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
}
