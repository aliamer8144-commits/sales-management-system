'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Package,
  ClipboardList,
  Box,
  Layers,
  CircleDot,
} from 'lucide-react';
import type { Product, ProductUnit } from '@/types';

// Get unit icon based on type
function getUnitIcon(unitType: string) {
  switch (unitType) {
    case 'carton':
      return <Box className="h-3.5 w-3.5" />;
    case 'packet':
      return <Layers className="h-3.5 w-3.5" />;
    case 'piece':
      return <CircleDot className="h-3.5 w-3.5" />;
    default:
      return <Package className="h-3.5 w-3.5" />;
  }
}

// Get unit color based on type
function getUnitColor(unitType: string) {
  switch (unitType) {
    case 'carton':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'packet':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'piece':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

interface InventoryCheckProps {
  onNavigate?: (view: string) => void;
}

export function InventoryCheck({ onNavigate }: InventoryCheckProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start matching
  const startMatching = () => {
    if (onNavigate) {
      onNavigate('inventory-matching');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">الجرد</h1>
            <p className="text-sm text-slate-500">قائمة المنتجات والمخزون</p>
          </div>
          <Button
            className="gap-2 bg-slate-800 hover:bg-slate-900"
            onClick={startMatching}
            disabled={isLoading || products.length === 0}
          >
            <ClipboardList className="h-4 w-4" />
            بدء المطابقة
          </Button>
        </div>
      </div>

      {/* Products List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product, idx) => (
              <Card key={product.id} className="overflow-hidden border-0 shadow-sm">
                <div className="flex">
                  {/* Index */}
                  <div className="w-14 bg-slate-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  {/* Content */}
                  <CardContent className="flex-1 p-4">
                    <h3 className="font-semibold text-slate-800 mb-2">{product.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.units
                        .filter(u => u.stockQuantity > 0)
                        .map((unit) => (
                          <Badge
                            key={unit.id}
                            variant="outline"
                            className={`gap-1.5 ${getUnitColor(unit.unitType)} border font-medium`}
                          >
                            {getUnitIcon(unit.unitType)}
                            <span>{unit.stockQuantity} {unit.unitName}</span>
                          </Badge>
                        ))}
                      {product.units.every(u => u.stockQuantity === 0) && (
                        <span className="text-sm text-slate-400">لا يوجد مخزون</span>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
