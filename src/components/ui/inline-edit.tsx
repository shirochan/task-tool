import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { Loader2, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'textarea' | 'select';
  options?: SelectOption[];
  placeholder?: string;
  validation?: (value: string) => string | null;
  className?: string;
  editClassName?: string;
  displayClassName?: string;
  multiline?: boolean;
  disabled?: boolean;
}

export const InlineEdit = React.forwardRef<HTMLDivElement, InlineEditProps>(
  ({
    value: initialValue,
    onSave,
    type = 'text',
    options = [],
    placeholder,
    validation,
    className,
    editClassName,
    displayClassName,
    multiline = false,
    disabled = false,
    ...props
  }, ref) => {
    const {
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
    } = useInlineEdit({
      initialValue,
      onSave,
      validation,
    });

    const handleSelectChange = (newValue: string) => {
      setValue(newValue);
    };

    // Selectタイプの場合、値が変更されたら自動保存
    React.useEffect(() => {
      if (type === 'select' && isEditing && value !== initialValue) {
        saveEdit();
      }
    }, [type, isEditing, value, initialValue, saveEdit]);

    const handleDisplayClick = () => {
      if (!disabled) {
        startEdit();
      }
    };

    const renderEditingComponent = () => {
      if (type === 'select') {
        return (
          <Select value={value} onValueChange={handleSelectChange}>
            <SelectTrigger className={cn('w-full', editClassName)} autoFocus>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      if (type === 'textarea' || multiline) {
        return (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn('min-h-[60px] resize-none', editClassName)}
            disabled={isLoading}
          />
        );
      }

      return (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(editClassName)}
          disabled={isLoading}
        />
      );
    };

    const getDisplayValue = () => {
      if (type === 'select') {
        const option = options.find(opt => opt.value === initialValue);
        return option?.label || initialValue;
      }
      return initialValue || placeholder || 'クリックして編集';
    };

    return (
      <div ref={ref} className={cn('inline-edit-wrapper', className)} {...props}>
        {isEditing ? (
          <div className="relative">
            {renderEditingComponent()}
            
            {/* ローディング表示 */}
            {isLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            
            {/* 保存・キャンセルボタン（select以外） */}
            {type !== 'select' && !isLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={saveEdit}
                  className="p-1 hover:bg-green-100 rounded text-green-600"
                  type="button"
                  title="保存 (Enter)"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  type="button"
                  title="キャンセル (Esc)"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {/* エラー表示 */}
            {error && (
              <div className="absolute top-full left-0 mt-1 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 z-10">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={handleDisplayClick}
            className={cn(
              'inline-edit-display cursor-pointer hover:bg-gray-50 rounded px-2 py-1 border border-transparent hover:border-gray-200 transition-colors',
              disabled && 'cursor-default hover:bg-transparent hover:border-transparent',
              !initialValue && 'text-gray-400 italic',
              displayClassName
            )}
            title={disabled ? undefined : 'クリックして編集'}
          >
            {getDisplayValue()}
          </div>
        )}
      </div>
    );
  }
);

InlineEdit.displayName = 'InlineEdit';