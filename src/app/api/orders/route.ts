import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAuth } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    const prisma = await getCurrentPrismaClient()

    const orders = await prisma.order.findMany({
      where: {
        userId: currentUser.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        orderDetails: {
          include: {
            material: true
          }
        }
      }
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.projectName,
      customerAddress: order.personInCharge || '',
      loadingDate: order.loadingDate,
      deliveryDate: order.deliveryDate || order.orderDate,
      totalWeight: Math.round(order.orderDetails.reduce((sum, detail) => {
        const itemWeight = detail.totalWeightKg || (detail.quantity * detail.material.weightKg);
        return sum + Math.round(itemWeight * 10000) / 10000;
      }, 0) * 10000) / 10000,
      status: order.status,
      createdAt: order.createdAt,
      items: order.orderDetails.map((detail) => ({
        productName: detail.material.name,
        quantity: detail.quantity,
        weightPerUnit: detail.material.weightKg,
        totalWeight: Math.round((detail.totalWeightKg || (detail.quantity * detail.material.weightKg)) * 10000) / 10000
      }))
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    
    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();
    const prisma = await getCurrentPrismaClient()
    const data = await request.json();

    console.log('Received order data:', JSON.stringify(data, null, 2));

    // ユーザー名 + ランダムなユニークIDで注文番号を生成
    const uniqueId = randomBytes(4).toString('hex').toUpperCase();
    const orderNumber = `${currentUser.username.toUpperCase()}-${uniqueId}`;

    // copyFromOrderIdが指定されている場合、元の発注書のisTemporary材料を複製してIDマッピングを作成
    const materialIdMap = new Map<string, string>();
    if (data.copyFromOrderId) {
      console.log('Copying temporary materials from order:', data.copyFromOrderId);

      const temporaryMaterials = await prisma.material.findMany({
        where: {
          isTemporary: true,
          createdForOrderId: data.copyFromOrderId
        }
      });

      console.log('Found temporary materials:', temporaryMaterials.length);

      // 各isTemporary材料を複製して新しいorderIdに紐づける
      for (const material of temporaryMaterials) {
        // 新しいmaterialCodeを生成
        // 元のコードから最後のサフィックス（-XXXXの部分）を削除して、新しいサフィックスを追加
        const baseCode = material.materialCode.split('-').slice(0, 2).join('-'); // OT-001の部分だけを取得
        const suffix = randomBytes(2).toString('hex').toUpperCase();
        const newMaterialCode = `${baseCode}-${suffix}`;

        const newMaterial = await prisma.material.create({
          data: {
            materialCode: newMaterialCode,
            name: material.name,
            categoryId: material.categoryId,
            size: material.size,
            type: material.type,
            weightKg: material.weightKg,
            notes: material.notes,
            isActive: true,
            isTemporary: true,
            createdForOrderId: null // まだorderIdを設定しない
          }
        });

        // 古いID -> 新しいIDのマッピングを作成
        materialIdMap.set(material.id, newMaterial.id);
        console.log(`Mapped material: ${material.id} -> ${newMaterial.id} (base: ${baseCode}, new code: ${newMaterialCode})`);
      }
    }

    // itemsのmaterialIdをマッピングで置き換え
    const mappedItems = data.items?.map((item: { materialId: string; quantity: number; totalWeightKg: number; notes: string | null }) => ({
      materialId: materialIdMap.get(item.materialId) || item.materialId,
      quantity: item.quantity,
      totalWeightKg: item.totalWeightKg,
      notes: item.notes
    })) || [];

    const order = await prisma.order.create({
        data: {
          orderNumber: orderNumber,
          userId: currentUser.id,
          projectName: data.projectName || 'プロジェクト',
          personInCharge: data.personInCharge,
          contactInfo: data.contactInfo || null,
          loadingDate: data.loadingDate ? new Date(data.loadingDate) : null,
          orderDate: new Date(data.orderDate || new Date()),
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          status: data.status || 'draft',
          notes: data.notes || null,
          orderDetails: {
            create: mappedItems
          }
        },
        include: {
          orderDetails: {
            include: {
              material: true
            }
          }
        }
      });

    // 複製した材料のcreatedForOrderIdを更新
    if (data.copyFromOrderId && materialIdMap.size > 0) {
      await prisma.material.updateMany({
        where: {
          id: { in: Array.from(materialIdMap.values()) }
        },
        data: {
          createdForOrderId: order.id
        }
      });
      console.log('Updated createdForOrderId for copied materials');
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error creating order:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await requireAuth();
    const prisma = await getCurrentPrismaClient()
    const data = await request.json();
    const { orderId, ...updateData } = data;

    console.log('Updating order:', orderId, JSON.stringify(updateData, null, 2));

    // ユーザーがこの注文の所有者であることを確認
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!existingOrder || existingOrder.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }
    
    // 既存の注文詳細を削除
    await prisma.orderDetail.deleteMany({
      where: { orderId: orderId }
    });
    
    // 注文を更新
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        projectName: updateData.projectName || 'プロジェクト',
        personInCharge: updateData.personInCharge,
        contactInfo: updateData.contactInfo || null,
        loadingDate: updateData.loadingDate ? new Date(updateData.loadingDate) : null,
        orderDate: new Date(updateData.orderDate || new Date()),
        deliveryDate: updateData.deliveryDate ? new Date(updateData.deliveryDate) : null,
        status: updateData.status || 'draft',
        notes: updateData.notes || null,
        orderDetails: {
          create: updateData.items?.map((item: { materialId: string; quantity: number; totalWeightKg: number; notes: string | null }) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            totalWeightKg: item.totalWeightKg,
            notes: item.notes
          })) || []
        }
      },
      include: {
        orderDetails: {
          include: {
            material: true
          }
        }
      }
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error updating order:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}