import { NextResponse } from 'next/server';
import { getCurrentPrismaClient } from '@/lib/tenant/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient()
    const resolvedParams = await params;
    const order = await prisma.order.findUnique({
      where: {
        id: resolvedParams.id,
        tenantId: currentUser.tenantId,
        userId: currentUser.id
      },
      include: {
        orderDetails: {
          include: {
            material: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.projectName,
      customerAddress: order.personInCharge || '',
      contactInfo: order.contactInfo || '',
      loadingDate: order.loadingDate,
      deliveryDate: order.deliveryDate || order.orderDate,
      shippingAddress: order.notes || '',
      totalWeight: Math.round(order.orderDetails.reduce((sum, detail) => {
        const itemWeight = detail.totalWeightKg || (detail.quantity * detail.material.weightKg);
        return sum + Math.round(itemWeight * 10000) / 10000;
      }, 0) * 10000) / 10000,
      status: order.status,
      createdAt: order.createdAt,
      items: order.orderDetails.map((detail) => ({
        materialId: detail.materialId,
        productName: detail.material.name,
        categoryName: detail.material.category.name,
        quantity: detail.quantity,
        weightPerUnit: detail.material.weightKg,
        totalWeight: Math.round((detail.totalWeightKg || (detail.quantity * detail.material.weightKg)) * 10000) / 10000,
        notes: detail.notes
      }))
    };

    return NextResponse.json({ order: formattedOrder });
  } catch (error) {
    console.error('Error fetching order:', error);
    
    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient()
    const resolvedParams = await params;
    const data = await request.json();

    console.log('Updating order:', resolvedParams.id, JSON.stringify(data, null, 2));

    // ユーザーがこの注文の所有者であり、同じテナントであることを確認
    const existingOrder = await prisma.order.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingOrder || existingOrder.tenantId !== currentUser.tenantId || existingOrder.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }
    
    // 既存の注文詳細を削除
    await prisma.orderDetail.deleteMany({
      where: { orderId: resolvedParams.id }
    });
    
    // 注文を更新
    const order = await prisma.order.update({
      where: { id: resolvedParams.id },
      data: {
        projectName: data.projectName || 'プロジェクト',
        personInCharge: data.personInCharge,
        contactInfo: data.contactInfo || null,
        loadingDate: data.loadingDate ? new Date(data.loadingDate) : null,
        orderDate: new Date(data.orderDate || new Date()),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        status: data.status || 'draft',
        notes: data.notes || null,
        orderDetails: {
          create: data.items?.map((item: { materialId: string; quantity: number; totalWeightKg: number; notes: string | null }) => ({
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
            material: {
              include: {
                category: true
              }
            }
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const prisma = getCurrentPrismaClient()
    const resolvedParams = await params;

    console.log('Deleting order:', resolvedParams.id);

    // 注文が存在し、ユーザーが所有者であることを確認
    const existingOrder = await prisma.order.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!existingOrder || existingOrder.tenantId !== currentUser.tenantId) {
      return NextResponse.json(
        { error: '発注書が見つかりません' },
        { status: 404 }
      );
    }

    if (existingOrder.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'アクセスが拒否されました' },
        { status: 403 }
      );
    }
    
    // 注文詳細はカスケード削除で自動的に削除される（Prisma schemaのonDelete: Cascade）
    await prisma.order.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ 
      message: '発注書を削除しました',
      deletedOrderId: resolvedParams.id
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.message === '認証が必要です') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '発注書の削除に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}