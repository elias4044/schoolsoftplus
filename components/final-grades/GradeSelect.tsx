'use client';

import { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

import styles from '@/app/(dashboard)/final-grades/page.module.css';

interface Props {
  id?: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  failing?: boolean;
}

export function GradeSelect({ id, label, value, options, onChange, disabled, failing }: Props) {
  const [keyboard, setKeyboard] = useState(false);
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger
        id={id}
        aria-label={label}
        className={styles.selectTrigger}
        data-failing={failing}
        onPointerDown={() => setKeyboard(false)}
        onKeyDown={() => setKeyboard(true)}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className={styles.selectContent}
          data-keyboard={keyboard}
          onKeyDown={() => setKeyboard(true)}
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item className={styles.selectItem} key={option.value} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
