"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MaterialOrderItem,
  OrderDocument,
} from "@/types/material-order";
import { formatWeight, formatTotalWeight } from "@/lib/utils/format";
import AddMaterialForm from "./AddMaterialForm";
import { ChevronDown, ChevronUp } from "lucide-react";

const orderFormSchema = z.object({
  ordererName: z.string().min(1, "注文者名を入力してください"),
  siteName: z.string().min(1, "現場名を入力してください"),
  contactInfo: z.string().optional(),
  loadingDate: z.string().optional(),
  // note: z.string().optional(), // コメントアウト
  materials: z.record(z.number().int().min(0)),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface EditOrderData {
  orderId: string;
  ordererName: string;
  siteName: string;
  contactInfo: string;
  loadingDate: string;
  // note: string; // コメントアウト
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
  categoryId: string;
  size?: string;
  weightKg: number;
  isActive: boolean;
};

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
  savedAt: number;
}

// コンポーネント外で同期的に下書きデータを読み込む
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

  // 初回レンダリング時に同期的に下書きを読み込む
  const initialDraft = useRef(loadDraft(storageKey));

  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
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
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(!!initialDraft.current);
  const isInitializedRef = useRef(!!initialDraft.current);
  const saveEnabledRef = useRef(false);

  // sessionStorage から下書きデータを削除
  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // sessionStorage が使えない環境では無視
    }
  }, [storageKey]);

  // 編集データが props で渡された場合に設定
  useEffect(() => {
    if (editOrderData) {
      setEditData(editOrderData);
    }
  }, [editOrderData]);

  // defaultValues を下書きデータから構築（同期的）
  const draft = initialDraft.current;
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      ordererName: draft?.ordererName || "",
      siteName: draft?.siteName || "",
      contactInfo: draft?.contactInfo || "",
      loadingDate: draft?.loadingDate || "",
      materials: draft?.materials || {},
    },
  });

  // 編集データの読み込みとデータ取得（初回のみ）
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 編集モードの場合はeditData.orderId、新規の場合は復元したdraftOrderIdを使用
        const orderId = editMode ? editData?.orderId : initialDraft.current?.draftOrderId || null;
        const materialsUrl = orderId ? `/api/materials?orderId=${orderId}` : '/api/materials';

        const [categoriesRes, materialsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch(materialsUrl)
        ]);

        const categoriesData = await categoriesRes.json();
        const materialsData = await materialsRes.json();

        setCategories(categoriesData);
        setMaterials(materialsData);

        // 下書き復元済みの場合はカテゴリを上書きしない
        if (categoriesData.length > 0 && !initialDraft.current?.selectedCategoryId) {
          setSelectedCategoryId(categoriesData[0].id);
        }

      } catch (error) {
        console.error('データの取得に失敗しました:', error);
      } finally {
        setLoading(false);
        // データ取得完了後に自動保存を有効化
        requestAnimationFrame(() => {
          saveEnabledRef.current = true;
        });
      }
    };

    fetchData();
  }, [editMode, editData]);

  // 下書きデータの資材数量を setValue で反映（useWatch が検知できるように）
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

  // 編集データと資材データが揃ったらフォームを初期化（下書き復元済みの場合はスキップ）
  useEffect(() => {
    if (isInitializedRef.current) return;

    if (editMode && editData && materials.length > 0 && !loading) {
      // 資材の数量を復元
      const materialQuantities: { [key: string]: number } = {};
      editData.items?.forEach((item) => {
        const material = materials.find((m: Material) => m.name === item.name);
        if (material) {
          materialQuantities[material.id] = item.quantity;
        }
      });

      const formData = {
        ordererName: editData.ordererName || "",
        siteName: editData.siteName || "",
        contactInfo: editData.contactInfo || "",
        loadingDate: editData.loadingDate || "",
        materials: materialQuantities,
      };

      reset(formData);
      isInitializedRef.current = true;
    }
  }, [editMode, editData, materials, loading, reset]);

  // useWatchを使用してフォームフィールドを監視
  const watchedMaterials = useWatch({
    control,
    name: 'materials',
    defaultValue: {}
  });

  const watchedFields = useWatch({
    control,
    name: ['ordererName', 'siteName', 'contactInfo', 'loadingDate'],
  });
  
  const selectedMaterials = useMemo(() => watchedMaterials || {}, [watchedMaterials]);

  // フォームデータを sessionStorage に自動保存（デバウンス 500ms）
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
          savedAt: Date.now(),
        };
        sessionStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        // sessionStorage が使えない環境では無視
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedMaterials, watchedFields, selectedCategoryId, draftOrderId, loading, getValues, storageKey]);

  const currentMaterials = useMemo(() => {
    const filtered = materials.filter(m => {
      if (m.categoryId !== selectedCategoryId || !m.isActive) {
        return false;
      }

      if (searchQuery.trim() === "") {
        return true;
      }

      const query = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(query) ||
             (m.size && m.size.toLowerCase().includes(query)) ||
             m.materialCode.toLowerCase().includes(query);
    });

    // 編集モードの場合は、数量が0より大きいものを優先的に上に表示
    if (editMode) {
      return filtered.sort((a, b) => {
        const quantityA = selectedMaterials[a.id] || 0;
        const quantityB = selectedMaterials[b.id] || 0;

        // 数量が0より大きいものを優先
        if (quantityA > 0 && quantityB === 0) return -1;
        if (quantityA === 0 && quantityB > 0) return 1;
        return 0;
      });
    }

    return filtered;
  }, [materials, selectedCategoryId, searchQuery, editMode, selectedMaterials]);

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const isOtherCategory = selectedCategory?.name === 'その他';

  const handleAddMaterialClick = async () => {
    // 新規発注で、まだ draft が作成されていない場合は draft 発注を作成
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
        console.log('Draft order created:', data.order.id);
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

  // 注文ボタンまでスクロールする関数
  const scrollToSubmit = () => {
    if (submitButtonRef.current) {
      submitButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // 一番上までスクロールする関数
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const orderItems = useMemo(() => {
    const items: MaterialOrderItem[] = [];
    const unitWeights: number[] = []; // 単位重量のみ（最小重量判定用）
    let total = 0;
    
    console.log('orderItems recalculating, selectedMaterials:', selectedMaterials);
    
    Object.entries(selectedMaterials).forEach(([materialId, quantity]) => {
      if (quantity > 0) {
        const material = materials.find((m) => m.id === materialId);
        
        if (material) {
          const materialWeight = Number(material.weightKg);
          const totalWeight = Math.round((materialWeight * Number(quantity)) * 10000) / 10000;
          console.log(`Material ${material.name}: ${quantity} x ${materialWeight}kg = ${totalWeight}kg`);
          console.log(`Running total before adding: ${total}`);
          
          items.push({
            id: material.id,
            name: material.name,
            categoryName: categories.find(c => c.id === material.categoryId)?.name || '',
            quantity: Number(quantity),
            weightPerUnit: materialWeight,
            totalWeight: totalWeight,
          });
          
          // 単位重量を記録（重複なし、最小重量判定用）
          if (!unitWeights.includes(materialWeight)) {
            unitWeights.push(materialWeight);
          }
          
          total += totalWeight;
          console.log(`Running total after adding: ${total}`);
        }
      }
    });

    // 浮動小数点演算の精度問題を回避
    total = Math.round(total * 10000) / 10000;
    
    console.log('Total weight calculated:', total);
    console.log('Unit weights for precision:', unitWeights);
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

  const onFormSubmit = (data: OrderFormData) => {
    const orderDocument: OrderDocument = {
      ordererName: data.ordererName,
      siteName: data.siteName,
      contactInfo: data.contactInfo,
      loadingDate: data.loadingDate,
      orderDate: new Date().toISOString(),
      // note: data.note, // コメントアウト
      items: orderItems.items,
      totalWeight: orderItems.totalWeight,
    };
    onSubmit(orderDocument);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] p-4 flex items-center justify-center">
        <div className="text-[#71717a]">データを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] p-6">
      <form onSubmit={handleSubmit(onFormSubmit)} className="max-w-6xl mx-auto">
        {restoredFromDraft && (
          <div className="mb-4 p-3 bg-[#ecfeff] border border-[#a5f3fc] rounded-xl flex items-center justify-between">
            <span className="text-sm text-[#0891b2] font-medium">前回の入力内容を復元しました</span>
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
              className="px-3 py-1 text-xs border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5] rounded-lg transition-colors"
            >
              クリア
            </button>
          </div>
        )}

        <div className="space-y-6 mb-10 bg-white p-8 rounded-2xl border border-[#e4e4e7]">
          <div className="relative">
            <label className="block text-sm font-semibold mb-2 text-[#71717a]">
              注文者名 <span className="text-red-500">*</span>
            </label>
            <input
              {...register("ordererName")}
              type="text"
              className="w-full px-4 py-3 text-base text-[#18181b] border border-[#d4d4d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all placeholder:text-[#a1a1aa]"
              placeholder="山田太郎"
            />
            {errors.ordererName && (
              <p className="text-red-500 mt-2 text-sm font-medium">{errors.ordererName.message}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold mb-2 text-[#71717a]">
              現場名 <span className="text-red-500">*</span>
            </label>
            <input
              {...register("siteName")}
              type="text"
              className="w-full px-4 py-3 text-base text-[#18181b] border border-[#d4d4d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all placeholder:text-[#a1a1aa]"
              placeholder="〇〇ビル新築工事"
            />
            {errors.siteName && (
              <p className="text-red-500 mt-2 text-sm font-medium">{errors.siteName.message}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold mb-2 text-[#71717a]">
              連絡先
            </label>
            <input
              {...register("contactInfo")}
              type="text"
              className="w-full px-4 py-3 text-base text-[#18181b] border border-[#d4d4d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all placeholder:text-[#a1a1aa]"
              placeholder="090-1234-5678"
            />
            {errors.contactInfo && (
              <p className="text-red-500 mt-2 text-sm font-medium">{errors.contactInfo.message}</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold mb-2 text-[#71717a]">
              積込日
            </label>
            <input
              {...register("loadingDate")}
              type="date"
              placeholder="積込予定日を選択"
              className="w-full px-4 py-3 text-base text-[#18181b] border border-[#d4d4d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all placeholder:text-[#a1a1aa]"
            />
            {errors.loadingDate && (
              <p className="text-red-500 mt-2 text-sm font-medium">{errors.loadingDate.message}</p>
            )}
          </div>

          {/* 備考入力フィールド - コメントアウト
          <div className="relative">
            <label className="block text-sm font-semibold mb-2 text-[#71717a]">
              備考
            </label>
            <textarea
              {...register("note")}
              className="w-full px-4 py-3 text-base text-[#18181b] border border-[#d4d4d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all placeholder:text-[#a1a1aa] resize-none"
              rows={3}
              placeholder="特記事項があれば入力"
            />
          </div>
          */}
        </div>

        <div className="mb-10 bg-white p-8 rounded-2xl border border-[#e4e4e7]">
          <label className="block text-base font-bold mb-4 text-[#18181b]">
            カテゴリー
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={`px-5 py-3 rounded-xl font-medium text-base transition-all ${
                  selectedCategoryId === category.id
                    ? "bg-[#0891b2] text-white"
                    : "bg-white text-[#18181b] border border-[#e4e4e7] hover:bg-[#fafafa]"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-[#18181b]">
              資材選択
            </h2>
            {isOtherCategory && (
              <button
                type="button"
                onClick={handleAddMaterialClick}
                className="px-4 py-2 bg-[#0891b2] text-white rounded-lg hover:bg-[#0e7490] transition-all font-medium text-sm"
              >
                <span>材料を追加</span>
              </button>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-[#e4e4e7]">
            <label className="block text-lg font-semibold mb-4 text-[#71717a]">
              資材検索
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 text-base text-[#18181b] border border-[#d4d4d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all placeholder:text-[#a1a1aa] pr-12"
                placeholder="資材名で検索..."
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-8 h-8 bg-[#ecfeff] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="text-[#0891b2]"></path>
                  </svg>
                </div>
              </div>
            </div>
            {searchQuery && (
              <div className="flex justify-between items-center mt-4 p-3 bg-[#fafafa] rounded-xl border border-[#e4e4e7]">
                <span className="text-[#71717a] font-medium">
                  {currentMaterials.length}件見つかりました
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-3 py-1.5 text-sm border border-[#d4d4d8] bg-white text-[#18181b] hover:bg-[#f4f4f5] rounded-lg transition-colors font-medium"
                >
                  クリア
                </button>
              </div>
            )}
          </div>
        {currentMaterials.map((material) => (
          <div
            key={material.id}
            className="bg-white rounded-2xl p-4 md:p-6 hover:shadow-sm transition-all border border-[#e4e4e7]"
          >
            <div className="mb-4">
              <h3 className="text-base font-bold text-[#18181b] mb-2">{material.name}</h3>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-[#ecfeff] text-[#0891b2] text-xs font-medium rounded-full">
                  {formatWeight(Number(material.weightKg))}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center justify-center sm:justify-start space-x-3 md:space-x-4">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(material.id, -1)}
                  className="w-12 h-12 bg-white border border-[#6366f1] text-[#6366f1] rounded-lg text-xl font-bold hover:bg-[#eef2ff] transition-all active:scale-95"
                >
                  −
                </button>
                <Controller
                  name={`materials.${material.id}`}
                  control={control}
                  defaultValue={0}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      min="0"
                      step="1"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // 空文字の場合はそのまま空文字を設定（0にしない）
                        if (inputValue === '') {
                          field.onChange('');
                          return;
                        }
                        const value = parseInt(inputValue);
                        // 数値でない場合は0、負の数の場合は0にする
                        if (isNaN(value)) {
                          field.onChange(0);
                        } else {
                          field.onChange(Math.max(0, value));
                        }
                      }}
                      onFocus={(e) => {
                        // フォーカス時に全選択
                        e.target.select();
                      }}
                      onBlur={(e) => {
                        // フォーカスが外れた時に空文字なら0にする
                        if (e.target.value === '' || e.target.value === null) {
                          field.onChange(0);
                        }
                      }}
                      className="w-16 md:w-20 text-center text-lg bg-white border border-[#d4d4d8] rounded-lg p-2 font-bold text-[#18181b] focus:outline-none focus:ring-2 focus:ring-[#0891b2] focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  )}
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(material.id, 1)}
                  className="w-12 h-12 bg-white border border-[#6366f1] text-[#6366f1] rounded-lg text-xl font-bold hover:bg-[#eef2ff] transition-all active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="flex justify-center sm:justify-end">
                <div className="px-3 py-1.5 bg-[#ecfeff] text-[#0891b2] font-bold text-sm rounded-lg">
                  {formatWeight(Number(selectedMaterials[material.id] || 0) * Number(material.weightKg))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

        <div className="bg-white rounded-2xl p-8 border border-[#e4e4e7] mb-8">
          <div className="text-center mb-6">
            <div className="text-[#a1a1aa] text-sm font-medium uppercase tracking-wider mb-2">合計重量</div>
            <div className="text-4xl font-bold text-[#18181b]">
              {formatTotalWeight(orderItems.totalWeight)}
            </div>
          </div>
          <div className="flex justify-center items-center space-x-8 text-[#71717a]">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#18181b]">{orderItems.items.length}</div>
              <div className="text-sm font-medium">選択資材</div>
            </div>
            <div className="w-px h-12 bg-[#e4e4e7]"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#18181b]">
                {orderItems.items.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
              <div className="text-sm font-medium">合計点数</div>
            </div>
          </div>
        </div>

        <button
          ref={submitButtonRef}
          type="submit"
          disabled={orderItems.items.length === 0}
          className="w-full py-4 bg-[#0891b2] text-white text-lg font-bold rounded-xl hover:bg-[#0e7490] disabled:bg-[#a1a1aa] disabled:cursor-not-allowed transition-all"
        >
          {editMode ? '発注書を更新' : '発注書を作成'}
        </button>
      </form>
      
      {/* スクロールボタン */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
        <button
          onClick={scrollToTop}
          className="w-14 h-14 bg-white border border-[#6366f1] text-[#6366f1] hover:bg-[#eef2ff] rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center"
          title="一番上まで移動"
        >
          <ChevronUp className="h-7 w-7" />
        </button>
        <button
          onClick={scrollToSubmit}
          className="w-14 h-14 bg-white border border-[#6366f1] text-[#6366f1] hover:bg-[#eef2ff] rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center"
          title="注文ボタンまで移動"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
      
      {showAddMaterialForm && (
        <AddMaterialForm
          categoryId={selectedCategoryId}
          orderId={editMode ? editData?.orderId : draftOrderId}
          onSuccess={handleAddMaterial}
          onCancel={() => setShowAddMaterialForm(false)}
        />
      )}
    </div>
  );
}