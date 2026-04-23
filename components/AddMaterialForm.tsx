"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const addMaterialSchema = z.object({
  name: z.string().min(1, "材料名を入力してください"),
  size: z.string().optional(),
  type: z.string().optional(),
  weightKg: z.number().min(0, "重量は0以上で入力してください"),
  notes: z.string().optional(),
});

type AddMaterialFormData = z.infer<typeof addMaterialSchema>;

type Material = {
  id: string;
  materialCode: string;
  name: string;
  categoryId: string;
  size?: string;
  type: string;
  weightKg: number;
  isActive: boolean;
};

interface AddMaterialFormProps {
  categoryId: string;
  orderId?: string | null;
  onSuccess: (material: Material) => void;
  onCancel: () => void;
}

export default function AddMaterialForm({
  categoryId,
  orderId,
  onSuccess,
  onCancel,
}: AddMaterialFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddMaterialFormData>({
    resolver: zodResolver(addMaterialSchema),
    defaultValues: {
      name: "",
      size: "",
      type: "標準",
      weightKg: 0,
      notes: "",
    },
  });

  const onSubmit = async (data: AddMaterialFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          categoryId,
          isTemporary: !!orderId,
          createdForOrderId: orderId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '材料の追加に失敗しました');
      }

      const newMaterial = await response.json();
      onSuccess(newMaterial);
      reset();
    } catch (error) {
      console.error('材料追加エラー:', error);
      alert(error instanceof Error ? error.message : '材料の追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md bg-surface rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">新規資材を追加</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="材料名" required error={errors.name?.message}>
            <input
              {...register("name")}
              type="text"
              placeholder="材料名を入力"
              className="form-input"
            />
          </Field>

          <Field label="サイズ">
            <input
              {...register("size")}
              type="text"
              placeholder="例: 1.2×5.1"
              className="form-input"
            />
          </Field>

          <Field label="種別" error={errors.type?.message}>
            <input
              {...register("type")}
              type="text"
              className="form-input"
            />
          </Field>

          <Field label="重量 (kg)" required error={errors.weightKg?.message}>
            <input
              {...register("weightKg", { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="0.0001"
              placeholder="0.0000"
              className="form-input font-mono tabular-nums"
            />
          </Field>

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "追加中..." : "追加"}
            </button>
          </DialogFooter>
        </form>

        <style jsx>{`
          .form-input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            background: var(--color-surface);
            font-size: 14px;
            color: var(--color-foreground);
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
          }
          .form-input::placeholder {
            color: var(--color-subtle);
          }
          .form-input:focus {
            border-color: var(--color-accent);
            box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
