'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { useGetForm, useGetFormFields, useSubmitResponse, useSubmitCurrentSession, useTranslateForm } from '@/lib/hooks/useForms';
import { useHoverTranslation } from '@/lib/hooks/useHoverTranslation';
import { FormHead } from '@/components/FormHead';
import { LanguageSelector } from '@/components/LanguageSelector';
import { TranslatableText } from '@/components/TranslatableText';
import Link from 'next/link';
import { Loader2, CheckCircle, Home, RotateCcw } from 'lucide-react';
import { SupportedLanguages, FormTranslationDTO } from '@/lib/api';

interface FormResponse {
  [fieldId: string]: string | undefined;
}

interface FormField {
  id: string;
  label: string;
  description?: string;
  field_type: 'Text' | 'LongText' | 'Numerical' | 'Boolean' | 'Select' | 'Multiselect' | 'Email' | 'Phone' | 'Currency' | 'Date' | 'URL' | 'Alpha' | 'Alphanum';
  required: boolean;
  possible_answers?: string | null;
  number_bounds?: string | null;
  text_bounds?: string | null;
  position?: number | null;
}

export default function FormPage() {
  const params = useParams();
  const formId = params.formId as string;
  
  const [responses, setResponses] = useState<FormResponse>({});
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [translatedContent, setTranslatedContent] = useState<FormTranslationDTO | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);
  const [originalFieldsMap, setOriginalFieldsMap] = useState<Record<string, FormField>>({});
  const [hoverTranslationLanguage, setHoverTranslationLanguage] = useState<SupportedLanguages | null>(null);
  const [translationMethod, setTranslationMethod] = useState<'hover' | 'full'>('hover');
  
  // Initialize hover translation hook
  const {
    translateText,
    clearCache,
    isEnabled: hoverTranslationEnabled,
    setIsEnabled: setHoverTranslationEnabled,
  } = useHoverTranslation();
  
  const { data: form, isLoading: formLoading } = useGetForm(formId);
  const { data: fields, isLoading: fieldsLoading } = useGetFormFields(formId);
  const submitResponseMutation = useSubmitResponse();
  const submitSessionMutation = useSubmitCurrentSession();
  const translateFormMutation = useTranslateForm();

  // Use translated content if available, otherwise use original
  const currentForm = isTranslated && translatedContent ? translatedContent.form : form;
  const currentFields = isTranslated && translatedContent ? translatedContent.fields : fields;

  // Store original fields when they're loaded
  useEffect(() => {
    if (fields && !isTranslated) {
      const fieldsMap: Record<string, FormField> = {};
      fields.forEach(field => {
        fieldsMap[field.id] = field;
      });
      setOriginalFieldsMap(fieldsMap);
    }
  }, [fields, isTranslated]);

  const handleTranslate = async (language: SupportedLanguages) => {
    try {
      const translated = await translateFormMutation.mutateAsync({ formId, language });
      setTranslatedContent(translated);
      setIsTranslated(true);
      
      // If hover translation was enabled, disable it when using full form translation
      if (hoverTranslationEnabled) {
        setHoverTranslationEnabled(false);
        setHoverTranslationLanguage(null);
        clearCache();
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleResetTranslation = () => {
    setIsTranslated(false);
    setTranslatedContent(null);
    setHoverTranslationEnabled(false);
    setHoverTranslationLanguage(null);
    clearCache();
  };

  const handleHoverTranslationToggle = (enabled: boolean, language: SupportedLanguages | null) => {
    setHoverTranslationEnabled(enabled);
    setHoverTranslationLanguage(language);
    
    if (enabled && language) {
      // If enabling hover translation, reset full form translation
      if (isTranslated) {
        setIsTranslated(false);
        setTranslatedContent(null);
      }
    } else {
      // Clear cache when disabling
      clearCache();
    }
  };

  const handleTranslationMethodChange = (method: 'hover' | 'full') => {
    setTranslationMethod(method);
  };

  // Helper function to wrap text with TranslatableText component
  const wrapWithTranslation = (text: string, children: React.ReactNode, className?: string) => {
    if (translationMethod === 'full' || !hoverTranslationEnabled || !hoverTranslationLanguage) {
      return children;
    }
    
    return (
      <TranslatableText
        text={text}
        onTranslate={translateText}
        language={hoverTranslationLanguage}
        isEnabled={hoverTranslationEnabled}
        className={className}
      >
        {children}
      </TranslatableText>
    );
  };

  // Helper function to map translated option back to original value
  // This ensures that when users select translated options, we store the original values
  const mapTranslatedToOriginal = (fieldId: string, translatedValue: string): string => {
    if (!isTranslated || !translatedContent) return translatedValue;
    
    const originalField = originalFieldsMap[fieldId];
    const translatedField = translatedContent.fields.find(f => f.id === fieldId);
    
    if (!originalField || !translatedField || !originalField.possible_answers || !translatedField.possible_answers) {
      return translatedValue;
    }

    const originalOptions = originalField.possible_answers.split('\\').map(opt => opt.trim());
    const translatedOptions = translatedField.possible_answers.split('\\').map(opt => opt.trim());
    
    const translatedIndex = translatedOptions.indexOf(translatedValue);
    return translatedIndex >= 0 && translatedIndex < originalOptions.length 
      ? originalOptions[translatedIndex] 
      : translatedValue;
  };

  // Helper function to map original value to translated display
  // This ensures that stored values are displayed in the translated language
  const mapOriginalToTranslated = (fieldId: string, originalValue: string): string => {
    if (!isTranslated || !translatedContent) return originalValue;
    
    const originalField = originalFieldsMap[fieldId];
    const translatedField = translatedContent.fields.find(f => f.id === fieldId);
    
    if (!originalField || !translatedField || !originalField.possible_answers || !translatedField.possible_answers) {
      return originalValue;
    }

    const originalOptions = originalField.possible_answers.split('\\').map(opt => opt.trim());
    const translatedOptions = translatedField.possible_answers.split('\\').map(opt => opt.trim());
    
    const originalIndex = originalOptions.indexOf(originalValue);
    return originalIndex >= 0 && originalIndex < translatedOptions.length 
      ? translatedOptions[originalIndex] 
      : originalValue;
  };

  const validateField = (field: FormField, value: string): string | null => {
    // Check if required field is empty
    if (field.required && (!value || value.trim() === '')) {
      return `${field.label} is required`;
    }

    // Skip validation for empty optional fields
    if (!value || value.trim() === '') {
      return null;
    }

    switch (field.field_type) {
      case 'Text':
      case 'LongText':
      case 'Alpha':
      case 'Alphanum':
        if (field.text_bounds) {
          const [min, max] = field.text_bounds.split(':').map(Number);
          if (min && value.length < min) {
            return `${field.label} must be at least ${min} characters`;
          }
          if (max && value.length > max) {
            return `${field.label} must be no more than ${max} characters`;
          }
        }
        
        // Additional validation for Alpha and Alphanum
        if (field.field_type === 'Alpha' && !/^[a-zA-Z\s]*$/.test(value)) {
          return `${field.label} must contain only letters and spaces`;
        }
        if (field.field_type === 'Alphanum' && !/^[a-zA-Z0-9\s]*$/.test(value)) {
          return `${field.label} must contain only letters, numbers, and spaces`;
        }
        break;

      case 'Numerical':
      case 'Currency':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return `${field.label} must be a valid number`;
        }
        if (field.field_type === 'Currency' && numValue < 0) {
          return `${field.label} must be a positive value`;
        }
        if (field.number_bounds) {
          const [min, max] = field.number_bounds.split(':').map(Number);
          if (min !== undefined && numValue < min) {
            return `${field.label} must be at least ${min}`;
          }
          if (max !== undefined && numValue > max) {
            return `${field.label} must be no more than ${max}`;
          }
        }
        break;

      case 'Email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${field.label} must be a valid email address`;
        }
        break;

      case 'Phone':
        // Validate phone number in international format (starts with +)
        if (!value.startsWith('+')) {
          return `${field.label} must be a valid international phone number`;
        }
        // Basic validation - should be at least 10 digits after the +
        const phoneDigits = value.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
          return `${field.label} must be a valid phone number`;
        }
        break;

      case 'URL':
        try {
          new URL(value);
        } catch {
          return `${field.label} must be a valid URL`;
        }
        break;

      case 'Date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return `${field.label} must be a valid date`;
        }
        break;

      case 'Select':
        if (field.required && !value) {
          return `Please select an option for ${field.label}`;
        }
        break;

      case 'Multiselect':
        if (field.required && (!value || value.split(',').filter(v => v.trim()).length === 0)) {
          return `Please select at least one option for ${field.label}`;
        }
        break;

      case 'Boolean':
        if (field.required && value === '') {
          return `Please select an option for ${field.label}`;
        }
        break;
    }

    return null;
  };

  const validateAllFields = (): boolean => {
    if (!currentFields) return false;
    
    const errors: Record<string, string> = {};
    
    currentFields.forEach(field => {
      const value = responses[field.id] || '';
      const error = validateField(field, value);
      if (error) {
        errors[field.id] = error;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = async (fieldId: string, value: string | null) => {
    setResponses(prev => ({ ...prev, [fieldId]: value || undefined }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
    
    // Don't submit empty values
    if (value === null || value === '') {
      return;
    }
    
    try {
      await submitResponseMutation.mutateAsync({
        field_id: fieldId,
        value,
      });
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  };

  const handleSubmit = async () => {
    if (!validateAllFields()) {
      return; // Don't submit if validation fails
    }

    try {
      await submitSessionMutation.mutateAsync();
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit session:', error);
    }
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';

    switch (field.field_type) {
      case 'Text':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-foreground" id={`${field.id}-label`}>
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-destructive focus:border-destructive' : ''}`}
              aria-describedby={field.description ? `${field.id}-desc` : undefined}
              maxLength={field.text_bounds ? Number(field.text_bounds.split(':')[1]) || undefined : undefined}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'LongText':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-foreground" id={`${field.id}-label`}>
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <textarea
              id={field.id}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm text-base resize-y min-h-[100px] bg-background text-foreground placeholder:text-muted-foreground ${validationErrors[field.id] ? 'border-destructive focus:border-destructive' : 'border-border focus:border-ring focus:ring-ring'}`}
              aria-describedby={field.description ? `${field.id}-desc` : undefined}
              maxLength={field.text_bounds ? Number(field.text_bounds.split(':')[1]) || undefined : undefined}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Numerical':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-foreground" id={`${field.id}-label`}>
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              type="number"
              value={value}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Only allow valid numbers or empty string
                if (inputValue === '' || !isNaN(Number(inputValue))) {
                  handleFieldChange(field.id, inputValue || null);
                }
              }}
              onKeyDown={(e) => {
                // Prevent non-numeric characters except backspace, delete, tab, escape, enter, and decimal point
                if (!/[0-9]/.test(e.key) && 
                    !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
                    !(e.key === '.' && !value.includes('.')) && // Allow decimal point if not already present
                    !(e.key === '-' && value === '')) { // Allow minus sign only at the beginning
                  e.preventDefault();
                }
              }}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              min={field.number_bounds?.split(':')[0]}
              max={field.number_bounds?.split(':')[1]}
              step="any"
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-destructive focus:border-destructive' : ''}`}
              aria-describedby={field.description ? `${field.id}-desc` : undefined}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Boolean':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground" id={`${field.id}-label`}>
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <div 
              className="grid grid-cols-2 gap-3"
              role="radiogroup"
              aria-labelledby={`${field.id}-label`}
              aria-required={field.required}
            >
              <div
                role="radio"
                aria-checked={value === '1'}
                tabIndex={0}
                aria-labelledby={`${field.id}-yes-label`}
                className={`p-4 border rounded-lg hover:bg-accent/50 transition-all cursor-pointer ${
                  value === '1' 
                    ? 'border-primary bg-primary/10 shadow-sm' 
                    : validationErrors[field.id] ? 'border-destructive/50' : 'border-border'
                }`}
                onClick={() => handleFieldChange(field.id, '1')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFieldChange(field.id, '1');
                  }
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center space-x-2">
                    {value === '1' && (
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                    )}
                    <span id={`${field.id}-yes-label`} className={`text-center font-medium ${value === '1' ? 'text-primary' : 'text-foreground'}`}>
                      {wrapWithTranslation('Yes', 'Yes')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div
                role="radio"
                aria-checked={value === '0'}
                tabIndex={0}
                aria-labelledby={`${field.id}-no-label`}
                className={`p-4 border rounded-lg hover:bg-accent/50 transition-all cursor-pointer ${
                  value === '0' 
                    ? 'border-primary bg-primary/10 shadow-sm' 
                    : validationErrors[field.id] ? 'border-destructive/50' : 'border-border'
                }`}
                onClick={() => handleFieldChange(field.id, '0')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFieldChange(field.id, '0');
                  }
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center space-x-2">
                    {value === '0' && (
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                    )}
                    <span id={`${field.id}-no-label`} className={`text-center font-medium ${value === '0' ? 'text-primary' : 'text-foreground'}`}>
                      {wrapWithTranslation('No', 'No')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {validationErrors[field.id] && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Select':
        const options = field.possible_answers?.split('\\') || [];
        const selectDisplayValue = isTranslated ? mapOriginalToTranslated(field.id, value) : value;
        
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700" id={`${field.id}-label`}>
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Select
              value={selectDisplayValue}
              onValueChange={(newValue) => {
                // Map translated value back to original before storing
                const originalValue = isTranslated ? mapTranslatedToOriginal(field.id, newValue) : newValue;
                handleFieldChange(field.id, originalValue);
              }}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: string, index: number) => {
                  const optionText = option.trim();
                  return (
                    <SelectItem key={index} value={optionText} className="text-base py-3">
                      {wrapWithTranslation(optionText, optionText)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );

      case 'Multiselect':
        const multiOptions = field.possible_answers?.split('\\') || [];
        const selectedValues = value ? value.split(',') : [];
        // Map original values to translated for display
        const selectedDisplayValues = isTranslated 
          ? selectedValues.map(val => mapOriginalToTranslated(field.id, val)) 
          : selectedValues;
        
        return (
          <div key={field.id} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-3">Select all that apply:</p>
              {multiOptions.map((option: string, index: number) => {
                const optionValue = option.trim();
                const isSelected = selectedDisplayValues.includes(optionValue);
                
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-card border border-border rounded-md hover:border-border/80 transition-colors">
                    <Checkbox
                      id={`${field.id}-${index}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        // Map translated option back to original value
                        const originalOptionValue = isTranslated ? mapTranslatedToOriginal(field.id, optionValue) : optionValue;
                        
                        let newValues;
                        if (checked) {
                          newValues = [...selectedValues, originalOptionValue];
                        } else {
                          newValues = selectedValues.filter(v => v !== originalOptionValue);
                        }
                        handleFieldChange(field.id, newValues.join(','));
                      }}
                      className="h-5 w-5"
                    />
                    <Label htmlFor={`${field.id}-${index}`} className="text-base font-normal cursor-pointer flex-1 text-foreground">
                      {wrapWithTranslation(optionValue, optionValue)}
                    </Label>
                  </div>
                );
              })}
              {selectedValues.length > 0 && (
                <p className="text-sm text-blue-600 mt-2">
                  {selectedValues.length} option{selectedValues.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
        );

      case 'Email':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              type="email"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Phone':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <PhoneInput
              value={value}
              onChange={(val) => handleFieldChange(field.id, val || '')}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              className={validationErrors[field.id] ? 'border-red-500' : ''}
              aria-describedby={field.description ? `${field.id}-desc` : undefined}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'URL':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              type="url"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Date':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Currency':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Alpha':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => {
                // Only allow letters and spaces
                const alphaValue = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                handleFieldChange(field.id, alphaValue);
              }}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case 'Alphanum':
        return (
          <div key={field.id} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
                {wrapWithTranslation(field.label, field.label)}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-gray-500">
                  {wrapWithTranslation(field.description, field.description)}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => {
                // Only allow letters, numbers, and spaces
                const alphanumValue = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
                handleFieldChange(field.id, alphanumValue);
              }}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              required={field.required}
              className={`h-11 text-base ${validationErrors[field.id] ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {validationErrors[field.id] && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>⚠</span> {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (formLoading || fieldsLoading) {
    return (
      <>
        <FormHead form={currentForm || null} />
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <p className="mt-4 text-muted-foreground">Loading form...</p>
          </div>
        </div>
      </>
    );
  }

  if (!form || !fields) {
    return (
      <>
        <FormHead form={null} />
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-12">
              <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-destructive text-xl">!</span>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Form not found</h3>
              <p className="text-muted-foreground mb-6">
                The form you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
              <Link href="/">
                <Button className="w-full h-11">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <FormHead form={currentForm || null} submitted={true} />
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-16">
              <div className="h-16 w-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-600 dark:text-green-500 h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Thank you!</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your response has been submitted successfully. We appreciate your participation.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <FormHead form={currentForm || null} />
      <div className="min-h-screen bg-background py-4 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-6 pt-6 sm:pb-8 sm:pt-8 lg:pt-12 px-4 sm:px-6 lg:px-8">
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-3 leading-tight">
              {currentForm?.label && wrapWithTranslation(currentForm.label, currentForm.label)}
            </CardTitle>
            {currentForm?.description && (
              <CardDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {wrapWithTranslation(currentForm.description, currentForm.description)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
            {/* Language Translation Section */}
            <div className="mb-6">
              {isTranslated ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-400 font-medium flex-1">
                    Form has been translated
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetTranslation}
                    className="h-8"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Show Original
                  </Button>
                </div>
              ) : (
                <LanguageSelector
                  onTranslate={handleTranslate}
                  isTranslating={translateFormMutation.isPending}
                  disabled={submitted}
                  onHoverTranslationToggle={handleHoverTranslationToggle}
                  onTranslationMethodChange={handleTranslationMethodChange}
                  hoverTranslationEnabled={hoverTranslationEnabled}
                  translationMethod={translationMethod}
                />
              )}
              {translateFormMutation.error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    Translation failed. Please try again later.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-8">
              {currentFields ? [...currentFields].sort((a, b) => {
                const posA = a.position ?? 999999;
                const posB = b.position ?? 999999;
                return posA - posB;
              }).map(renderField) : null}
            </div>
            
            <div className="flex justify-end items-center gap-4 pt-8 mt-8 border-t border-border">
              <Button 
                onClick={handleSubmit}
                disabled={submitSessionMutation.isPending}
                className="w-full sm:w-auto h-11 px-8 text-base font-medium"
              >
                {submitSessionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Response'
                )}
              </Button>
            </div>
            
            {submitSessionMutation.error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive text-center">
                  Failed to submit form. Please check your responses and try again.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
