import { useState, useCallback, useRef, useEffect } from 'react';

type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface UseInlineEditProps<T> {
  initialValue: T;
  onSave: (value: T) => Promise<void>;
  onCancel?: () => void;
  validation?: (value: T) => string | null;
}

export interface UseInlineEditReturn<T> {
  isEditing: boolean;
  value: T;
  error: string | null;
  isLoading: boolean;
  inputRef: React.RefObject<EditableElement | null>;
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  setValue: (value: T) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleBlur: () => void;
}

export function useInlineEdit<T = string>({
  initialValue,
  onSave,
  onCancel,
  validation,
}: UseInlineEditProps<T>): UseInlineEditReturn<T> {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const [originalValue, setOriginalValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<EditableElement | null>(null);

  // 初期値が変更された場合の同期
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
      setOriginalValue(initialValue);
    }
  }, [initialValue, isEditing]);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setOriginalValue(value);
    setError(null);
    
    // 次のフレームでフォーカスを設定
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (typeof value === 'string' && inputRef.current instanceof HTMLInputElement) {
          inputRef.current.select();
        }
      }
    }, 0);
  }, [value]);

  const cancelEdit = useCallback(() => {
    setValue(originalValue);
    setIsEditing(false);
    setError(null);
    onCancel?.();
  }, [originalValue, onCancel]);

  const saveEdit = useCallback(async () => {
    if (isLoading) return;

    // バリデーション
    if (validation) {
      const validationError = validation(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // 値が変更されていない場合はキャンセル
    if (value === originalValue) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(value);
      setIsEditing(false);
      setOriginalValue(value);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [value, originalValue, validation, onSave, isLoading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const handleBlur = useCallback(() => {
    // エラーがある場合はblurでキャンセル
    if (error) {
      cancelEdit();
    } else {
      saveEdit();
    }
  }, [error, cancelEdit, saveEdit]);

  return {
    isEditing,
    value,
    error,
    isLoading,
    inputRef,
    startEdit,
    cancelEdit,
    saveEdit,
    setValue,
    handleKeyDown,
    handleBlur,
  };
}