"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useForm, Controller, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MaterialOrderItem,
  OrderDocument,
} from "@/types/material-order";
import { formatWeight, formatTotalWeight } from "@/lib/utils/format";
import AddMaterialForm from "./AddMaterialForm";
import { Search, X, Plus, Minus, ArrowRight, Check, Pencil, AlertTriangle, ChevronRight } from "lucide-react";

const orderFormSchema = z.object({
  ordererName: z.string().min(1, "注文者名を入力してください"),
  siteName: z.string().min(1, "現場名を入力してください"),
  contactInfo: z.string().optional(),
  loadingDate: z.string().optional(),
  materials: z.record(z.number().int().min(0)),
  truckOption: z.string().optional(),         // '' | <truckId> | 'custom'
  truckCustomName: z.string().optional(),
  truckCustomCapacityKg: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface EditOrderData {
  orderId: string;
  ordererName: string;
  siteName: string;
  contactInfo: string;
  loadingDate: string;
  truckId?: string | null;
  truckName?: string | null;
  truckCapacityKg?: number | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    weightPerUnit: number;
    totalWeight: number;
  }>;
}

interface MaterialOrderFormProps {
  onSubmit: (data: OrderDocument) => void;
  editMode?: boolean;
  editOrderData?: EditOrderData | null;
}

type Category = {
  id: string;
  name: string;
  displayOrder: number;
};

type Material = {
  id: string;
  materialCode: string;
  name: string;
  categoryId: string | null;
  size?: string;
  weightKg: number;
  isActive: boolean;
};

type Truck = {
  id: string;
  name: string;
  capacityKg: number;
  isActive: boolean;
};

const TRUCK_CUSTOM_OPTION = 'custom';

const UNCATEGORIZED_KEY = '__uncategorized__';
const UNCATEGORIZED_LABEL = '未分類';

// sessionStorage のキーを生成
function getDraftStorageKey(editMode: boolean, orderId?: string): string {
  if (editMode && orderId) {
    return `material-order-draft-edit-${orderId}`;
  }
  return 'material-order-draft-new';
}

interface DraftData {
  ordererName: string;
  siteName: string;
  contactInfo: string;
  loadingDate: string;
  materials: Record<string, number>;
  selectedCategoryId: string;
  draftOrderId: string | null;
  truckOption: string;
  truckCustomName: string;
  truckCustomCapacityKg: string;
  savedAt: number;
}

function loadDraft(storageKey: string): DraftData | null {
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return null;
}

export default function MaterialOrderForm({ onSubmit, editMode = false, editOrderData = null }: MaterialOrderFormProps) {
  const storageKey = useMemo(
    () => getDraftStorageKey(editMode, editOrderData?.orderId),
    [editMode, editOrderData?.orderId]
  );

  const initialDraft = useRef(loadDraft(storageKey));

  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialDraft.current?.selectedCategoryId || ""
  );
  const [loading, setLoading] = useState(true);
  const [showAddMaterialForm, setShowAddMaterialForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editData, setEditData] = useState<EditOrderData | null>(editOrderData);
  const [draftOrderId, setDraftOrderId] = useState<string | null>(
    initialDraft.current?.draftOrderId || null
  );
  const [restoredFromDraft, setRestoredFromDraft] = useState(!!initialDraft.current);
  const isInitializedRef = useRef(!!initialDraft.current);
  const saveEnabledRef = useRef(false);
  // 同名資材グループの開閉状態（true=展開, false=折りたたみ, 未設定=自動判定）
  const [groupExpandOverride, setGroupExpandOverride] = useState<Record<string, boolean>>({});

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    if (editOrderData) {
      setEditData(editOrderData);
    }
  }, [editOrderData]);

  const draft = initialDraft.current;
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      ordererName: draft?.ordererName || "",
      siteName: draft?.siteName || "",
      contactInfo: draft?.contactInfo || "",
      loadingDate: draft?.loadingDate || "",
      materials: draft?.materials || {},
      truckOption: draft?.truckOption ?? "",
      truckCustomName: draft?.truckCustomName ?? "",
      truckCustomCapacityKg: draft?.truckCustomCapacityKg ?? "",
    },
  });

  // Step 1 (基本情報) / Step 2 (資材選択) の切り替え
  const initialStep: 1 | 2 =
    (draft?.ordererName?.trim() && draft?.siteName?.trim()) ||
    (editMode && editOrderData)
      ? 2
      : 1;
  const [currentStep, setCurrentStep] = useState<1 | 2>(initialStep);

  const goToStep2 = async () => {
    const valid = await trigger(['ordererName', 'siteName']);
    if (valid) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep1 = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderId = editMode ? editData?.orderId : initialDraft.current?.draftOrderId || null;
        const materialsUrl = orderId ? `/api/materials?orderId=${orderId}` : '/api/materials';

        const [categoriesRes, materialsRes, trucksRes] = await Promise.all([
          fetch('/api/categories'),
          fetch(materialsUrl),
          fetch('/api/trucks'),
        ]);

        const categoriesData = await categoriesRes.json();
        const materialsData = await materialsRes.json();
        const trucksData = trucksRes.ok ? await trucksRes.json() : [];

        setCategories(categoriesData);
        setMaterials(materialsData);
        setTrucks(trucksData);

        if (!initialDraft.current?.selectedCategoryId) {
          if (categoriesData.length > 0) {
            setSelectedCategoryId(categoriesData[0].id);
          } else {
            setSelectedCategoryId(UNCATEGORIZED_KEY);
          }
        }
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => {
          saveEnabledRef.current = true;
        });
      }
    };

    fetchData();
  }, [editMode, editData]);

  useEffect(() => {
    if (!loading && initialDraft.current) {
      const draftMaterials = initialDraft.current.materials;
      if (draftMaterials && Object.keys(draftMaterials).length > 0) {
        Object.entries(draftMaterials).forEach(([id, qty]) => {
          setValue(`materials.${id}`, qty as number);
        });
      }
    }
  }, [loading, setValue]);

  useEffect(() => {
    if (isInitializedRef.current) return;

    if (editMode && editData && materials.length > 0 && !loading) {
      const materialQuantities: { [key: string]: number } = {};
      editData.items?.forEach((item) => {
        const material =
          materials.find((m: Material) => m.id === item.id) ||
          materials.find((m: Material) => m.name === item.name);
        if (material) {
          materialQuantities[material.id] = item.quantity;
        }
      });

      // トラック復元: master に該当 id があればそれを、無ければ snapshot からカスタムとして復元
      let truckOption = "";
      let truckCustomName = "";
      let truckCustomCapacityKg = "";
      if (editData.truckId && trucks.some((t) => t.id === editData.truckId)) {
        truckOption = editData.truckId;
      } else if (editData.truckName && editData.truckCapacityKg) {
        truckOption = TRUCK_CUSTOM_OPTION;
        truckCustomName = editData.truckName;
        truckCustomCapacityKg = String(editData.truckCapacityKg);
      }

      const formData = {
        ordererName: editData.ordererName || "",
        siteName: editData.siteName || "",
        contactInfo: editData.contactInfo || "",
        loadingDate: editData.loadingDate || "",
        materials: materialQuantities,
        truckOption,
        truckCustomName,
        truckCustomCapacityKg,
      };

      reset(formData);
      isInitializedRef.current = true;
    }
  }, [editMode, editData, materials, trucks, loading, reset]);

  const watchedMaterials = useWatch({
    control,
    name: 'materials',
    defaultValue: {}
  });

  const watchedFields = useWatch({
    control,
    name: ['ordererName', 'siteName', 'contactInfo', 'loadingDate'],
  });

  const watchedTruck = useWatch({
    control,
    name: ['truckOption', 'truckCustomName', 'truckCustomCapacityKg'],
  });

  const selectedMaterials = useMemo(() => watchedMaterials || {}, [watchedMaterials]);

  // 選択中トラックの実効値
  const selectedTruck = useMemo(() => {
    const [option, customName, customCapacity] = watchedTruck || [];
    if (!option) return null;
    if (option === TRUCK_CUSTOM_OPTION) {
      const cap = Number(customCapacity);
      if (!customName?.trim() || !Number.isFinite(cap) || cap <= 0) return null;
      return { id: null as string | null, name: customName.trim(), capacityKg: Math.round(cap) };
    }
    const t = trucks.find((tr) => tr.id === option);
    if (!t) return null;
    return { id: t.id, name: t.name, capacityKg: t.capacityKg };
  }, [watchedTruck, trucks]);

  useEffect(() => {
    if (loading || !saveEnabledRef.current) return;

    const timer = setTimeout(() => {
      try {
        const values = getValues();
        const draft: DraftData = {
          ordererName: values.ordererName || "",
          siteName: values.siteName || "",
          contactInfo: values.contactInfo || "",
          loadingDate: values.loadingDate || "",
          materials: watchedMaterials || {},
          selectedCategoryId,
          draftOrderId,
          truckOption: values.truckOption ?? "",
          truckCustomName: values.truckCustomName ?? "",
          truckCustomCapacityKg: values.truckCustomCapacityKg ?? "",
          savedAt: Date.now(),
        };
        sessionStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        // ignore
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedMaterials, watchedFields, watchedTruck, selectedCategoryId, draftOrderId, loading, getValues, storageKey]);

  const usesCategories = categories.length > 0;
  const isUncategorizedView = !usesCategories || selectedCategoryId === UNCATEGORIZED_KEY;

  const currentMaterials = useMemo(() => {
    const filtered = materials.filter(m => {
      if (!m.isActive) return false;

      // カテゴリなしテナントはタブを描画しないので全資材を表示。
      // カテゴリありテナントでは選択中タブに合致するもののみ。
      if (usesCategories) {
        const matchesCategory =
          selectedCategoryId === UNCATEGORIZED_KEY
            ? m.categoryId === null
            : m.categoryId === selectedCategoryId;
        if (!matchesCategory) return false;
      }

      if (searchQuery.trim() === "") {
        return true;
      }

      const query = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(query) ||
             (m.size && m.size.toLowerCase().includes(query)) ||
             m.materialCode.toLowerCase().includes(query);
    });

    return filtered;
  }, [materials, selectedCategoryId, searchQuery, usesCategories]);

  // 同名資材をグループ化（先頭出現順を保持）
  const materialGroups = useMemo<{ key: string; items: Material[] }[]>(() => {
    const map = new Map<string, Material[]>();
    for (const m of currentMaterials) {
      const list = map.get(m.name);
      if (list) list.push(m);
      else map.set(m.name, [m]);
    }
    let arr = Array.from(map, ([key, items]) => ({ key, items }));
    if (editMode) {
      arr = arr.sort((a, b) => {
        const aSel = a.items.some(it => Number(selectedMaterials[it.id] || 0) > 0);
        const bSel = b.items.some(it => Number(selectedMaterials[it.id] || 0) > 0);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        return 0;
      });
    }
    return arr;
  }, [currentMaterials, editMode, selectedMaterials]);

  const categoryTotalCount = useMemo(() => {
    if (!usesCategories) {
      return materials.filter(m => m.isActive).length;
    }
    if (selectedCategoryId === UNCATEGORIZED_KEY) {
      return materials.filter(m => m.categoryId === null && m.isActive).length;
    }
    return materials.filter(m => m.categoryId === selectedCategoryId && m.isActive).length;
  }, [materials, selectedCategoryId, usesCategories]);

  const uncategorizedCount = useMemo(
    () => materials.filter(m => m.categoryId === null && m.isActive).length,
    [materials],
  );

  const handleAddMaterialClick = async () => {
    if (!editMode && !draftOrderId) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: 'Draft',
            personInCharge: '',
            orderDate: new Date().toISOString(),
            status: 'draft',
            items: []
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create draft order');
        }

        const data = await response.json();
        setDraftOrderId(data.order.id);
      } catch (error) {
        console.error('Draft order creation failed:', error);
        alert('下書き発注の作成に失敗しました');
        return;
      }
    }
    setShowAddMaterialForm(true);
  };

  const handleAddMaterial = (newMaterial: Material) => {
    setMaterials(prev => [...prev, newMaterial]);
    setShowAddMaterialForm(false);
  };

  const orderItems = useMemo(() => {
    const items: MaterialOrderItem[] = [];
    const unitWeights: number[] = [];
    let total = 0;

    Object.entries(selectedMaterials).forEach(([materialId, quantity]) => {
      if (quantity > 0) {
        const material = materials.find((m) => m.id === materialId);

        if (material) {
          const materialWeight = Number(material.weightKg);
          const totalWeight = Math.round((materialWeight * Number(quantity)) * 10000) / 10000;

          items.push({
            id: material.id,
            name: material.name,
            size: material.size ?? null,
            categoryName: material.categoryId
              ? categories.find(c => c.id === material.categoryId)?.name || ''
              : '',
            quantity: Number(quantity),
            weightPerUnit: materialWeight,
            totalWeight: totalWeight,
          });

          if (!unitWeights.includes(materialWeight)) {
            unitWeights.push(materialWeight);
          }

          total += totalWeight;
        }
      }
    });

    total = Math.round(total * 10000) / 10000;
    return { items, totalWeight: total, unitWeights };
  }, [selectedMaterials, materials, categories]);

  const handleQuantityChange = (materialId: string, delta: number) => {
    const currentValue = selectedMaterials[materialId] || 0;
    const newValue = Math.max(0, currentValue + delta);
    setValue(`materials.${materialId}`, newValue, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  };

  const removeSelected = (materialId: string) => {
    setValue(`materials.${materialId}`, 0, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onFormSubmit = (data: OrderFormData) => {
    // 基本情報画面で誤ってフォーム送信された場合のガード
    if (currentStep !== 2) return;
    const orderDocument: OrderDocument = {
      ordererName: data.ordererName,
      siteName: data.siteName,
      contactInfo: data.contactInfo,
      loadingDate: data.loadingDate,
      orderDate: new Date().toISOString(),
      items: orderItems.items,
      totalWeight: orderItems.totalWeight,
      truckId: selectedTruck?.id ?? null,
      truckName: selectedTruck?.name ?? null,
      truckCapacityKg: selectedTruck?.capacityKg ?? null,
    };
    onSubmit(orderDocument);
  };

  const totalItemCount = orderItems.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = orderItems.items.length > 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-muted text-sm">データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="pb-28 lg:pb-10">
      <form onSubmit={handleSubmit(onFormSubmit)}>
        {restoredFromDraft && (
          <div className="mb-4 px-4 py-3 bg-accent-soft border border-accent/20 rounded-xl flex items-center justify-between gap-3">
            <span className="text-sm text-accent-hover font-medium">前回の入力内容を復元しました</span>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                reset({
                  ordererName: "",
                  siteName: "",
                  contactInfo: "",
                  loadingDate: "",
                  materials: {},
                });
                setRestoredFromDraft(false);
              }}
              className="px-3 py-1 text-xs font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
            >
              クリア
            </button>
          </div>
        )}

        {/* Steps indicator */}
        <div className="mb-5 px-4 sm:px-5 py-3 bg-surface border border-border rounded-xl flex items-center gap-2 sm:gap-3 overflow-x-auto">
          <Step num={1} label="情報入力" state={currentStep === 1 ? 'current' : 'done'} />
          <div className="h-px w-6 sm:w-10 bg-border flex-shrink-0" />
          <Step num={2} label="資材選択" state={currentStep === 2 ? 'current' : 'pending'} />
          <div className="h-px w-6 sm:w-10 bg-border flex-shrink-0" />
          <Step num={3} label="確認" state="pending" />
        </div>

        {/* STEP 1: 基本情報 */}
        {currentStep === 1 && (
          <>
            <section className="mb-5 bg-surface border border-border rounded-xl p-5 sm:p-6">
              <h2 className="text-sm font-bold text-foreground mb-4 tracking-tight">基本情報</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="注文者名" required error={errors.ordererName?.message}>
                  <input
                    {...register("ordererName")}
                    type="text"
                    placeholder="山田太郎"
                    className="input"
                  />
                </Field>

                <Field label="現場名" required error={errors.siteName?.message}>
                  <input
                    {...register("siteName")}
                    type="text"
                    placeholder="〇〇ビル新築工事"
                    className="input"
                  />
                </Field>

                <Field label="連絡先" error={errors.contactInfo?.message}>
                  <input
                    {...register("contactInfo")}
                    type="text"
                    placeholder="090-1234-5678"
                    className="input"
                  />
                </Field>

                <Field label="積込日" error={errors.loadingDate?.message}>
                  <input
                    {...register("loadingDate")}
                    type="date"
                    className="input"
                  />
                </Field>
              </div>

              {/* トラック選択 */}
              <div className="mt-4">
                <Field label="使用トラック">
                  <select
                    {...register("truckOption")}
                    className="input"
                  >
                    <option value="">未指定</option>
                    {trucks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}（{t.capacityKg.toLocaleString()}kg）
                      </option>
                    ))}
                    <option value={TRUCK_CUSTOM_OPTION}>カスタム入力…</option>
                  </select>
                </Field>

                {watchedTruck?.[0] === TRUCK_CUSTOM_OPTION && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="トラック名" required={false} error={errors.truckCustomName?.message}>
                      <input
                        {...register("truckCustomName")}
                        type="text"
                        placeholder="例: 4tユニック"
                        className="input"
                      />
                    </Field>
                    <Field label="積載量(kg)" required={false} error={errors.truckCustomCapacityKg?.message}>
                      <input
                        {...register("truckCustomCapacityKg")}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        placeholder="例: 4000"
                        className="input"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={goToStep2}
                className="w-full sm:w-auto px-6 py-3 bg-foreground text-background font-semibold text-sm rounded-md flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
              >
                資材選択へ
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* STEP 2: 資材選択 */}
        {currentStep === 2 && (
          <>
            {/* 情報サマリー */}
            <div className="mb-5 bg-surface border border-border rounded-xl px-4 sm:px-5 py-3 flex items-center gap-2 sm:gap-5 overflow-x-auto">
              <InfoSummaryItem label="注文者" value={watchedFields?.[0]} />
              <div className="h-6 w-px bg-border flex-shrink-0" />
              <InfoSummaryItem label="現場" value={watchedFields?.[1]} />
              {watchedFields?.[2] && (
                <>
                  <div className="h-6 w-px bg-border flex-shrink-0" />
                  <InfoSummaryItem label="連絡先" value={watchedFields[2]} />
                </>
              )}
              {watchedFields?.[3] && (
                <>
                  <div className="h-6 w-px bg-border flex-shrink-0" />
                  <InfoSummaryItem
                    label="積込日"
                    value={new Date(watchedFields[3]).toLocaleDateString('ja-JP')}
                  />
                </>
              )}
              {selectedTruck && (
                <>
                  <div className="h-6 w-px bg-border flex-shrink-0" />
                  <InfoSummaryItem
                    label="トラック"
                    value={`${selectedTruck.name} (${selectedTruck.capacityKg.toLocaleString()}kg)`}
                  />
                </>
              )}
              <button
                type="button"
                onClick={goToStep1}
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-muted border border-border bg-surface hover:bg-surface-muted rounded-md transition-colors flex-shrink-0"
              >
                <Pencil className="h-3 w-3" />
                編集
              </button>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-5">
          {/* LEFT: browser */}
          <div className="min-w-0 space-y-3">
            {/* Categories */}
            {usesCategories && (
              <div className="bg-surface border border-border rounded-xl p-2.5 flex gap-1.5 overflow-x-auto">
                {categories.map((category) => {
                  const isActive = selectedCategoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                        isActive
                          ? "bg-foreground text-background border-foreground"
                          : "bg-surface text-foreground border-border hover:bg-surface-muted"
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
                {uncategorizedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(UNCATEGORIZED_KEY)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                      selectedCategoryId === UNCATEGORIZED_KEY
                        ? "bg-foreground text-background border-foreground"
                        : "bg-surface text-foreground border-border hover:bg-surface-muted"
                    }`}
                  >
                    {UNCATEGORIZED_LABEL}
                  </button>
                )}
              </div>
            )}

            {/* Search */}
            <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <Search className="h-4 w-4 text-subtle flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="資材名・サイズ・コードで検索"
                className="flex-1 border-0 outline-none bg-transparent text-sm text-foreground placeholder:text-subtle"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-subtle hover:text-foreground transition-colors"
                  aria-label="クリア"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <span className="font-mono text-[11px] text-muted px-2.5 py-1 rounded-full bg-surface-muted tabular-nums tracking-wide">
                {searchQuery ? `${currentMaterials.length} / ${categoryTotalCount}` : `${categoryTotalCount} 件`}
              </span>
            </div>

            {/* Toolbar (add custom material when in uncategorized view) */}
            {isUncategorizedView && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddMaterialClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border bg-surface text-foreground hover:bg-surface-muted rounded-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  材料を追加
                </button>
              </div>
            )}

            {/* Material list */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {materialGroups.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-subtle">
                  {searchQuery ? "該当する資材がありません" : "資材が登録されていません"}
                </div>
              ) : (
                materialGroups.map((group, gIdx) => {
                  const isLastGroup = gIdx === materialGroups.length - 1;

                  // 単一サイズ → 従来どおりの行
                  if (group.items.length === 1) {
                    const material = group.items[0];
                    return (
                      <MaterialQtyRow
                        key={material.id}
                        material={material}
                        primaryLabel={`${material.name}${material.size ? `（${material.size}）` : ''}`}
                        control={control}
                        qty={Number(selectedMaterials[material.id] || 0)}
                        onChange={handleQuantityChange}
                        bordered={!isLastGroup}
                      />
                    );
                  }

                  // 同名で複数サイズ → アコーディオン
                  const groupTotalWeight = group.items.reduce(
                    (s, it) => s + Number(selectedMaterials[it.id] || 0) * Number(it.weightKg),
                    0,
                  );
                  const selectedSizeCount = group.items.filter(
                    it => Number(selectedMaterials[it.id] || 0) > 0,
                  ).length;
                  const autoExpand = selectedSizeCount > 0 || searchQuery.trim() !== '';
                  const open = group.key in groupExpandOverride
                    ? groupExpandOverride[group.key]
                    : autoExpand;

                  return (
                    <div
                      key={group.key}
                      className={!isLastGroup ? "border-b border-border" : ""}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setGroupExpandOverride(prev => ({ ...prev, [group.key]: !open }))
                        }
                        aria-expanded={open}
                        className="w-full px-4 py-3 flex items-center gap-3 sm:gap-4 text-left hover:bg-surface-muted transition-colors"
                      >
                        <ChevronRight
                          className={`h-4 w-4 text-muted flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground leading-tight line-clamp-2 break-words">
                            {group.key}
                          </div>
                          <div className="mt-0.5 text-xs font-mono tabular-nums text-muted">
                            {group.items.length}サイズ
                            {selectedSizeCount > 0 ? ` ・ ${selectedSizeCount}件選択中` : ''}
                          </div>
                        </div>
                        <div className="min-w-[70px] text-right font-mono text-sm tabular-nums font-semibold flex-shrink-0">
                          {groupTotalWeight > 0 ? (
                            <span className="text-foreground">{formatWeight(groupTotalWeight)}</span>
                          ) : (
                            <span className="text-subtle font-normal">—</span>
                          )}
                        </div>
                      </button>

                      {open && (
                        <div className="bg-surface-muted/50">
                          {group.items.map((material, sIdx) => {
                            const isLastSub = sIdx === group.items.length - 1;
                            return (
                              <MaterialQtyRow
                                key={material.id}
                                material={material}
                                primaryLabel={material.size || material.materialCode}
                                primaryWeight="medium"
                                indent
                                control={control}
                                qty={Number(selectedMaterials[material.id] || 0)}
                                onChange={handleQuantityChange}
                                bordered={!isLastSub}
                                borderSubtle
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: sticky summary (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-5 bg-surface border border-border rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-40px)]">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight">選択中の資材</h2>
                <span className="font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent tabular-nums">
                  {orderItems.items.length} 品
                </span>
              </div>

              <div className="flex-1 overflow-y-auto py-1 max-h-[min(340px,40vh)]">
                {orderItems.items.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-subtle leading-relaxed">
                    まだ資材が選択されていません。
                    <br />
                    左のリストから数量を入力してください。
                  </div>
                ) : (
                  orderItems.items.map((item) => (
                    <div key={item.id} className="px-5 py-2.5 flex items-start gap-3 hover:bg-surface-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground leading-snug truncate">
                          {item.name}{item.size ? `（${item.size}）` : ''}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] tabular-nums text-subtle">
                          {formatWeight(item.weightPerUnit)} × {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                          {formatWeight(item.totalWeight)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelected(item.id)}
                          className="w-5 h-5 flex items-center justify-center text-subtle hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                          aria-label={`${item.name}を削除`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-5 py-4 bg-surface-muted border-t border-border space-y-2">
                <div className="flex justify-between text-xs text-muted">
                  <span>合計点数</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">{totalItemCount} 個</span>
                </div>
                <div className="flex items-baseline justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted">合計重量</span>
                  <span className={`font-sans text-2xl font-bold tracking-tight tabular-nums ${selectedTruck && orderItems.totalWeight > selectedTruck.capacityKg ? 'text-red-600' : 'text-foreground'}`}>
                    {formatTotalWeight(orderItems.totalWeight)}
                  </span>
                </div>
                {selectedTruck && (
                  <CapacityGauge
                    truckName={selectedTruck.name}
                    capacityKg={selectedTruck.capacityKg}
                    currentKg={orderItems.totalWeight}
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={!hasItems}
                className="m-3 px-4 py-3 bg-foreground text-background font-semibold text-sm rounded-md flex items-center justify-center gap-2 hover:bg-foreground/90 disabled:bg-subtle disabled:cursor-not-allowed transition-colors"
              >
                {editMode ? "発注書を更新" : "発注書を作成"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
            </div>

            {/* Mobile fixed bottom bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border px-4 py-3 z-30 shadow-[0_-4px_12px_rgba(12,10,9,0.06)]">
              {selectedTruck && orderItems.totalWeight > selectedTruck.capacityKg && (
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{selectedTruck.name}の積載量を超過 (+{formatWeight(orderItems.totalWeight - selectedTruck.capacityKg)})</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono tracking-wider text-subtle uppercase tabular-nums">
                    {orderItems.items.length} 品 · {totalItemCount} 個
                    {selectedTruck && (
                      <span className="ml-1.5 normal-case tracking-normal">/ {selectedTruck.name}</span>
                    )}
                  </div>
                  <div className={`text-lg font-bold tracking-tight tabular-nums leading-tight ${selectedTruck && orderItems.totalWeight > selectedTruck.capacityKg ? 'text-red-600' : 'text-foreground'}`}>
                    {formatTotalWeight(orderItems.totalWeight)}
                    {selectedTruck && (
                      <span className="ml-1 text-xs font-medium text-muted">
                        / {selectedTruck.capacityKg.toLocaleString()}kg
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!hasItems}
                  className="px-5 py-3 bg-foreground text-background font-semibold text-sm rounded-md flex items-center gap-2 hover:bg-foreground/90 disabled:bg-subtle disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {editMode ? "更新" : "発注書を作成"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </form>

      {showAddMaterialForm && (
        <AddMaterialForm
          categoryId={isUncategorizedView ? null : selectedCategoryId}
          orderId={editMode ? editData?.orderId : draftOrderId}
          onSuccess={handleAddMaterial}
          onCancel={() => setShowAddMaterialForm(false)}
        />
      )}

      <style jsx>{`
        .input {
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
        .input::placeholder {
          color: var(--color-subtle);
        }
        .input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
        }
      `}</style>
    </div>
  );
}

/* ============ Sub-components ============ */

function Step({
  num,
  label,
  state,
}: {
  num: number;
  label: string;
  state: "done" | "current" | "pending";
}) {
  return (
    <div
      className={`flex items-center gap-2 flex-shrink-0 ${
        state === "current"
          ? "text-foreground"
          : state === "done"
          ? "text-muted"
          : "text-subtle"
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-semibold border ${
          state === "current"
            ? "bg-accent border-accent text-white ring-4 ring-accent/15"
            : state === "done"
            ? "bg-foreground border-foreground text-background"
            : "bg-surface border-border text-subtle"
        }`}
      >
        {state === "done" ? <Check className="w-3 h-3" strokeWidth={3} /> : num}
      </span>
      <span
        className={`text-xs sm:text-sm tracking-tight ${
          state === "current" ? "font-semibold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function InfoSummaryItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex flex-col flex-shrink-0 min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-subtle leading-none mb-1">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-foreground leading-none truncate">
        {value || "—"}
      </span>
    </div>
  );
}

function CapacityGauge({
  truckName,
  capacityKg,
  currentKg,
}: {
  truckName: string;
  capacityKg: number;
  currentKg: number;
}) {
  const ratio = capacityKg > 0 ? currentKg / capacityKg : 0;
  const overCapacity = currentKg > capacityKg;
  const fillPct = Math.max(0, Math.min(100, ratio * 100));

  return (
    <div className="pt-2 border-t border-border space-y-1.5">
      <div className="flex justify-between text-[11px] font-mono tabular-nums text-muted">
        <span>{truckName}</span>
        <span>{currentKg.toLocaleString()} / {capacityKg.toLocaleString()}kg</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${overCapacity ? 'bg-red-500' : 'bg-accent'}`}
          style={{ width: `${overCapacity ? 100 : fillPct}%` }}
        />
      </div>
      {overCapacity && (
        <div className="flex items-start gap-1.5 mt-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-md text-[11px] font-semibold text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
          <span className="leading-snug">
            積載量を超過しています（+{formatWeight(currentKg - capacityKg)}）
          </span>
        </div>
      )}
    </div>
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
      {error && (
        <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}

function MaterialQtyRow({
  material,
  primaryLabel,
  primaryWeight = "semibold",
  indent = false,
  control,
  qty,
  onChange,
  bordered,
  borderSubtle = false,
}: {
  material: Material;
  primaryLabel: string;
  primaryWeight?: "semibold" | "medium";
  indent?: boolean;
  control: Control<OrderFormData>;
  qty: number;
  onChange: (materialId: string, delta: number) => void;
  bordered: boolean;
  borderSubtle?: boolean;
}) {
  const unitWeight = Number(material.weightKg);
  const rowTotal = qty * unitWeight;
  const borderClass = bordered
    ? borderSubtle
      ? "border-b border-border/60"
      : "border-b border-border"
    : "";
  const padClass = indent ? "pl-11 pr-4 py-2.5" : "px-4 py-3";
  const labelWeightClass = primaryWeight === "medium" ? "font-medium" : "font-semibold";

  return (
    <div className={`${padClass} flex items-center gap-3 sm:gap-4 ${borderClass}`}>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${labelWeightClass} text-foreground leading-tight line-clamp-2 break-words`}>
          {primaryLabel}
        </div>
        <div className="mt-0.5 text-xs font-mono tabular-nums text-muted">
          {formatWeight(unitWeight)}
        </div>
      </div>

      <div className="flex items-center border border-border rounded-md overflow-hidden flex-shrink-0 bg-surface">
        <button
          type="button"
          onClick={() => onChange(material.id, -1)}
          className="w-8 h-8 flex items-center justify-center text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
          aria-label="減らす"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <Controller
          name={`materials.${material.id}`}
          control={control}
          defaultValue={0}
          render={({ field }) => (
            <input
              {...field}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={field.value ?? 0}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                  field.onChange('');
                  return;
                }
                const value = parseInt(inputValue);
                if (isNaN(value)) {
                  field.onChange(0);
                } else {
                  field.onChange(Math.max(0, value));
                }
              }}
              onFocus={(e) => {
                if (field.value === 0) {
                  field.onChange('');
                } else {
                  e.target.select();
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '' || e.target.value === null) {
                  field.onChange(0);
                }
              }}
              className="w-11 h-8 text-center text-sm font-semibold font-mono tabular-nums border-x border-border bg-transparent text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          )}
        />
        <button
          type="button"
          onClick={() => onChange(material.id, 1)}
          className="w-8 h-8 flex items-center justify-center text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
          aria-label="増やす"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-w-[70px] text-right font-mono text-sm tabular-nums font-semibold flex-shrink-0">
        {qty > 0 ? (
          <span className="text-foreground">{formatWeight(rowTotal)}</span>
        ) : (
          <span className="text-subtle font-normal">—</span>
        )}
      </div>
    </div>
  );
}
