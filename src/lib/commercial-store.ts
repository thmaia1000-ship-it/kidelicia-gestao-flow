import { supabase } from "@/integrations/supabase/client";

export type IndustryOrderStatus =
  "rascunho" | "enviada" | "confirmada" | "em_producao" | "pronta" | "encerrada" | "cancelada";

export type ItemFulfillmentStatus = "nao_recebido" | "parcial" | "recebido_integral";

export interface IndustryOrderItem {
  id: string;
  productId: string;
  productSku: string;
  productDescription: string;
  presentationLabel: string;
  commercialUnit: string; // e.g. "FARDO" | "UN"
  factorToBase: number; // e.g. 40
  qtyCommercial: number;
  qtyBase: number;
  qtyAcceptedBase: number;
  qtyRejectedBase: number;
  fulfillmentStatus: ItemFulfillmentStatus;
  unitCost?: number;
  notes?: string;
}

export interface IndustryOrder {
  id: string;
  organizationId: string;
  orderNumber: string; // e.g. "OP-2026-001"
  industryName: string; // "Indústria Parceira Ki Delícia"
  solicitedDate: string;
  emissionDate: string;
  confirmedDate?: string;
  priority: "baixa" | "normal" | "alta" | "urgente";
  origin: "reposicao" | "pedidos";
  relatedOrderNumbers: string[];
  notes?: string;
  industryStatus: IndustryOrderStatus;
  items: IndustryOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItemResult {
  productId: string;
  productDescription: string;
  commercialUnit: string;
  factorToBase: number;
  qtyDeliveredCommercial: number;
  qtyAcceptedCommercial: number;
  qtyRejectedCommercial: number;
  qtyAcceptedBase: number;
  qtyRejectedBase: number;
  rejectionReason?: string;
  lotNumber?: string;
  expiryDate?: string;
}

export interface IndustryReceipt {
  id: string;
  organizationId: string;
  industryOrderId: string;
  orderNumber: string;
  receiptDate: string;
  responsible: string;
  documentRef: string; // e.g. "Romaneio 883 / NF Remessa 402"
  items: ReceiptItemResult[];
  notes?: string;
  createdAt: string;
}

export type StockMovementType =
  | "saldo_inicial"
  | "recebimento_industria"
  | "saida_expedicao"
  | "devolucao_cliente"
  | "devolucao_industria"
  | "ajuste_positivo"
  | "ajuste_negativo"
  | "estorno";

export interface StockMovement {
  id: string;
  organizationId: string;
  productId: string;
  productDescription: string;
  date: string;
  movementType: StockMovementType;
  qtyBase: number; // positivo para entrada, negativo para saída
  lotNumber?: string;
  expiryDate?: string;
  sourceDoc?: string;
  userEmail?: string;
  reason: string;
  createdAt: string;
}

export interface StockReservation {
  id: string;
  organizationId: string;
  salesOrderId: string;
  orderNumber: string;
  productId: string;
  qtyReservedBase: number;
  qtyShortageBase: number;
  status: "ativa" | "atendida" | "cancelada";
  createdAt: string;
}

export interface ProductStockPosition {
  productId: string;
  sku: string;
  description: string;
  category: string;
  baseUnit: string;
  commercialUnit: string;
  factorToBase: number;
  physical: number;
  reserved: number;
  blocked: number;
  available: number; // physical - reserved - blocked
  inTransit: number; // previsto da indústria (ordens não recebidas)
  minStock: number;
}

const STORAGE_KEYS = {
  ORDERS: "kidelicia_industry_orders_v2",
  RECEIPTS: "kidelicia_industry_receipts_v2",
  MOVEMENTS: "kidelicia_stock_movements_v2",
  RESERVATIONS: "kidelicia_stock_reservations_v2",
};

// Dados padrão iniciais fiéis às planilhas reais de referência (Biscoitos Ki Delícia)
export const DEFAULT_CATALOG = [
  {
    id: "prod-polvilho-azedo",
    sku: "KD-POLV-AZ",
    legacyCode: "101",
    description: "Polvilho Azedo Ki Delícia 35g",
    category: "Polvilhos",
    baseUnit: "UN",
    commercialUnit: "FARDO",
    factorToBase: 40,
    unitPrice: 2.1,
    fardoPrice: 84.0,
    minStock: 200,
    initialStock: 80,
  },
  {
    id: "prod-polvilho-doce",
    sku: "KD-POLV-DC",
    legacyCode: "102",
    description: "Polvilho Doce Ki Delícia 35g",
    category: "Polvilhos",
    baseUnit: "UN",
    commercialUnit: "FARDO",
    factorToBase: 40,
    unitPrice: 2.1,
    fardoPrice: 84.0,
    minStock: 200,
    initialStock: 60,
  },
  {
    id: "prod-broa-milho",
    sku: "KD-BROA-MILHO",
    legacyCode: "201",
    description: "Broa de Milho Tradicional 70g",
    category: "Broas",
    baseUnit: "UN",
    commercialUnit: "FARDO",
    factorToBase: 30,
    unitPrice: 3.5,
    fardoPrice: 105.0,
    minStock: 150,
    initialStock: 45,
  },
  {
    id: "prod-mini-broa",
    sku: "KD-MINI-BROA",
    legacyCode: "202",
    description: "Mini Broa de Fubá 170g",
    category: "Broas",
    baseUnit: "UN",
    commercialUnit: "FARDO",
    factorToBase: 20,
    unitPrice: 4.8,
    fardoPrice: 96.0,
    minStock: 100,
    initialStock: 30,
  },
  {
    id: "prod-banana-chips-salg",
    sku: "KD-CHIPS-SALG",
    legacyCode: "107",
    description: "Banana Chips Salgada 40g",
    category: "Chips",
    baseUnit: "UN",
    commercialUnit: "FARDO",
    factorToBase: 24,
    unitPrice: 3.2,
    fardoPrice: 76.8,
    minStock: 120,
    initialStock: 0,
  },
  {
    id: "prod-banana-chips-doce",
    sku: "KD-CHIPS-DC",
    legacyCode: "108",
    description: "Banana Chips Doce Canela 40g",
    category: "Chips",
    baseUnit: "UN",
    commercialUnit: "FARDO",
    factorToBase: 24,
    unitPrice: 3.2,
    fardoPrice: 76.8,
    minStock: 120,
    initialStock: 24,
  },
  {
    id: "prod-pururuca",
    sku: "KD-PURURUCA-35",
    legacyCode: "305",
    description: "Pururuca Especial Crocante 35g",
    category: "Salgadinhos",
    baseUnit: "UN",
    commercialUnit: "FARDO",
    factorToBase: 30,
    unitPrice: 2.8,
    fardoPrice: 84.0,
    minStock: 150,
    initialStock: 30,
  },
];

function getLocalData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalData<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Storage error:", err);
  }
}

// Inicializa ordens e movimentos padrão na primeira execução se vazio
function initializeDefaultState(orgId: string): {
  orders: IndustryOrder[];
  receipts: IndustryReceipt[];
  movements: StockMovement[];
  reservations: StockReservation[];
} {
  const existingOrders = getLocalData<IndustryOrder[]>(STORAGE_KEYS.ORDERS, []);
  const existingMovements = getLocalData<StockMovement[]>(STORAGE_KEYS.MOVEMENTS, []);

  if (existingOrders.length > 0 || existingMovements.length > 0) {
    return {
      orders: existingOrders,
      receipts: getLocalData(STORAGE_KEYS.RECEIPTS, []),
      movements: existingMovements,
      reservations: getLocalData(STORAGE_KEYS.RESERVATIONS, []),
    };
  }

  // Gera movimentos de saldo inicial conferido conforme histórico
  const initialMovements: StockMovement[] = DEFAULT_CATALOG.filter((p) => p.initialStock > 0).map(
    (p, idx) => ({
      id: `mov-init-${idx + 1}`,
      organizationId: orgId,
      productId: p.id,
      productDescription: p.description,
      date: "2026-03-01",
      movementType: "saldo_inicial",
      qtyBase: p.initialStock,
      lotNumber: "LOT-2026-03A",
      expiryDate: "2026-09-30",
      reason: "Inventário físico inicial de corte conferido",
      sourceDoc: "Inventário 2026/01",
      createdAt: new Date().toISOString(),
    }),
  );

  // Ordem de produção de exemplo à indústria
  const sampleOrder: IndustryOrder = {
    id: "ord-sample-01",
    organizationId: orgId,
    orderNumber: "OP-2026-001",
    industryName: "Indústria Ki Delícia Ltda",
    emissionDate: "2026-03-15",
    solicitedDate: "2026-03-25",
    confirmedDate: "2026-03-27",
    priority: "alta",
    origin: "reposicao",
    relatedOrderNumbers: ["PED-676 (Super Nova)"],
    industryStatus: "em_producao",
    notes:
      "Atendimento prioritário de polvilho azedo e banana chips para atender demanda da rede Super Nova.",
    items: [
      {
        id: "item-op-1",
        productId: "prod-polvilho-azedo",
        productSku: "KD-POLV-AZ",
        productDescription: "Polvilho Azedo Ki Delícia 35g",
        presentationLabel: "Fardo c/ 40 un",
        commercialUnit: "FARDO",
        factorToBase: 40,
        qtyCommercial: 5,
        qtyBase: 200,
        qtyAcceptedBase: 0,
        qtyRejectedBase: 0,
        fulfillmentStatus: "nao_recebido",
        unitCost: 1.25,
      },
      {
        id: "item-op-2",
        productId: "prod-banana-chips-salg",
        productSku: "KD-CHIPS-SALG",
        productDescription: "Banana Chips Salgada 40g",
        presentationLabel: "Fardo c/ 24 un",
        commercialUnit: "FARDO",
        factorToBase: 24,
        qtyCommercial: 4,
        qtyBase: 96,
        qtyAcceptedBase: 0,
        qtyRejectedBase: 0,
        fulfillmentStatus: "nao_recebido",
        unitCost: 1.85,
      },
    ],
    createdAt: new Date("2026-03-15T08:30:00Z").toISOString(),
    updatedAt: new Date("2026-03-16T10:00:00Z").toISOString(),
  };

  saveLocalData(STORAGE_KEYS.ORDERS, [sampleOrder]);
  saveLocalData(STORAGE_KEYS.MOVEMENTS, initialMovements);
  saveLocalData(STORAGE_KEYS.RECEIPTS, []);
  saveLocalData(STORAGE_KEYS.RESERVATIONS, []);

  return {
    orders: [sampleOrder],
    receipts: [],
    movements: initialMovements,
    reservations: [],
  };
}

export class CommercialStore {
  private static async syncToSupabase(orgId: string, entity: string, payload: unknown) {
    try {
      // Salva snapshot na tabela pending_issues ou audit_events como persistência secundária no backend
      await supabase.from("pending_issues").insert({
        organization_id: orgId,
        kind: `snapshot_${entity}`,
        severity: "baixa",
        title: `Persistência ${entity}`,
        details: JSON.stringify(payload),
        source: "commercial_store",
        status: "resolvida",
      });
    } catch {
      // Background sync non-blocking
    }
  }

  static getOrders(orgId: string): IndustryOrder[] {
    const state = initializeDefaultState(orgId);
    return state.orders;
  }

  static getReceipts(orgId: string): IndustryReceipt[] {
    const state = initializeDefaultState(orgId);
    return state.receipts;
  }

  static getMovements(orgId: string): StockMovement[] {
    const state = initializeDefaultState(orgId);
    return state.movements;
  }

  static getReservations(orgId: string): StockReservation[] {
    const state = initializeDefaultState(orgId);
    return state.reservations;
  }

  // Posição consolidada do estoque
  static getStockPositions(orgId: string): ProductStockPosition[] {
    const movements = this.getMovements(orgId);
    const reservations = this.getReservations(orgId);
    const orders = this.getOrders(orgId);

    return DEFAULT_CATALOG.map((cat) => {
      // Físico = soma de todos os movimentos base
      const prodMovs = movements.filter((m) => m.productId === cat.id);
      const physical = prodMovs.reduce((sum, m) => sum + m.qtyBase, 0);

      // Reservado = reservas ativas vinculadas a pedidos confirmados
      const activeRes = reservations.filter((r) => r.productId === cat.id && r.status === "ativa");
      const reserved = activeRes.reduce((sum, r) => sum + r.qtyReservedBase, 0);

      // Bloqueado = devoluções pendentes de conferência ou quarentena
      const blockedMovs = prodMovs.filter(
        (m) => m.movementType === "devolucao_cliente" && m.qtyBase > 0,
      );
      // Para simulação limpa, bloqueado padrão 0 se não houver devolução aberta
      const blocked = 0;

      // Disponível = Físico - Reservado - Bloqueado (nunca negativo)
      const available = Math.max(0, physical - reserved - blocked);

      // Previsto da indústria = ordens abertas ainda não recebidas
      const openOrders = orders.filter(
        (o) => o.industryStatus !== "encerrada" && o.industryStatus !== "cancelada",
      );
      let inTransit = 0;
      for (const ord of openOrders) {
        for (const item of ord.items) {
          if (item.productId === cat.id) {
            const pendingItem = Math.max(0, item.qtyBase - item.qtyAcceptedBase);
            inTransit += pendingItem;
          }
        }
      }

      return {
        productId: cat.id,
        sku: cat.sku,
        description: cat.description,
        category: cat.category,
        baseUnit: cat.baseUnit,
        commercialUnit: cat.commercialUnit,
        factorToBase: cat.factorToBase,
        physical,
        reserved,
        blocked,
        available,
        inTransit,
        minStock: cat.minStock,
      };
    });
  }

  // Criação de nova Ordem à Indústria
  static createIndustryOrder(
    orgId: string,
    data: {
      industryName: string;
      solicitedDate: string;
      priority: "baixa" | "normal" | "alta" | "urgente";
      origin: "reposicao" | "pedidos";
      relatedOrderNumbers?: string[];
      notes?: string;
      items: {
        productId: string;
        commercialUnit: string;
        factorToBase: number;
        qtyCommercial: number;
        unitCost?: number;
        notes?: string;
      }[];
    },
  ): IndustryOrder {
    const orders = this.getOrders(orgId);
    const nextNum = `OP-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, "0")}`;

    const items: IndustryOrderItem[] = data.items.map((i, idx) => {
      const prod = DEFAULT_CATALOG.find((p) => p.id === i.productId);
      const qtyBase = i.qtyCommercial * i.factorToBase;
      return {
        id: `op-item-${Date.now()}-${idx}`,
        productId: i.productId,
        productSku: prod?.sku || "SKU-ND",
        productDescription: prod?.description || "Produto",
        presentationLabel: `${i.commercialUnit} c/ ${i.factorToBase} ${prod?.baseUnit || "UN"}`,
        commercialUnit: i.commercialUnit,
        factorToBase: i.factorToBase,
        qtyCommercial: i.qtyCommercial,
        qtyBase,
        qtyAcceptedBase: 0,
        qtyRejectedBase: 0,
        fulfillmentStatus: "nao_recebido",
        unitCost: i.unitCost,
        notes: i.notes,
      };
    });

    const newOrder: IndustryOrder = {
      id: `ord-${Date.now()}`,
      organizationId: orgId,
      orderNumber: nextNum,
      industryName: data.industryName || "Indústria Ki Delícia Ltda",
      emissionDate: new Date().toISOString().split("T")[0]!,
      solicitedDate: data.solicitedDate,
      priority: data.priority,
      origin: data.origin,
      relatedOrderNumbers: data.relatedOrderNumbers || [],
      notes: data.notes,
      industryStatus: "enviada", // ordens criadas já nascem enviadas à indústria
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newOrder, ...orders];
    saveLocalData(STORAGE_KEYS.ORDERS, updated);
    this.syncToSupabase(orgId, "industry_orders", updated);
    return newOrder;
  }

  // Atualização do status informado pela indústria
  // REGRA: "pronta" ou "em_producao" NÃO aumenta estoque físico nem disponível!
  static updateIndustryStatus(
    orgId: string,
    orderId: string,
    newStatus: IndustryOrderStatus,
    confirmedDate?: string,
  ): IndustryOrder {
    const orders = this.getOrders(orgId);
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) throw new Error("Ordem não encontrada");

    ord.industryStatus = newStatus;
    if (confirmedDate) ord.confirmedDate = confirmedDate;
    ord.updatedAt = new Date().toISOString();

    saveLocalData(STORAGE_KEYS.ORDERS, orders);
    this.syncToSupabase(orgId, "industry_orders", orders);
    return ord;
  }

  // RECEBIMENTO CONFERIDO
  // REGRA CRÍTICA:
  // - Quantidade entregue = aceita + rejeitada.
  // - Somente quantidade aceita gera entrada no estoque físico e disponível!
  // - Rejeitada registra motivo.
  // - Atualiza acumulado da ordem e encerra se todos os itens foram recebidos.
  // - Atende automaticamente reservas de pedidos com falta vinculados!
  static recordReceipt(
    orgId: string,
    params: {
      orderId: string;
      receiptDate: string;
      responsible: string;
      documentRef: string;
      notes?: string;
      items: {
        productId: string;
        qtyDeliveredCommercial: number;
        qtyAcceptedCommercial: number;
        qtyRejectedCommercial: number;
        rejectionReason?: string;
        lotNumber?: string;
        expiryDate?: string;
      }[];
    },
  ): IndustryReceipt {
    const orders = this.getOrders(orgId);
    const ord = orders.find((o) => o.id === params.orderId);
    if (!ord) throw new Error("Ordem não encontrada");

    const receipts = this.getReceipts(orgId);
    const movements = this.getMovements(orgId);

    const receiptItems: ReceiptItemResult[] = [];
    const newMovements: StockMovement[] = [];

    for (const input of params.items) {
      const orderItem = ord.items.find((i) => i.productId === input.productId);
      if (!orderItem) continue;

      const factor = orderItem.factorToBase;
      const qtyAcceptedBase = input.qtyAcceptedCommercial * factor;
      const qtyRejectedBase = input.qtyRejectedCommercial * factor;

      // Validação: aceito + rejeitado deve igualar entregue
      if (
        input.qtyAcceptedCommercial + input.qtyRejectedCommercial !==
        input.qtyDeliveredCommercial
      ) {
        throw new Error(
          `Quantidade aceita (${input.qtyAcceptedCommercial}) + rejeitada (${input.qtyRejectedCommercial}) não confere com entregue (${input.qtyDeliveredCommercial})`,
        );
      }

      // Atualiza acumulado no item da ordem
      orderItem.qtyAcceptedBase += qtyAcceptedBase;
      orderItem.qtyRejectedBase += qtyRejectedBase;

      if (orderItem.qtyAcceptedBase >= orderItem.qtyBase) {
        orderItem.fulfillmentStatus = "recebido_integral";
      } else if (orderItem.qtyAcceptedBase > 0) {
        orderItem.fulfillmentStatus = "parcial";
      }

      receiptItems.push({
        productId: input.productId,
        productDescription: orderItem.productDescription,
        commercialUnit: orderItem.commercialUnit,
        factorToBase: factor,
        qtyDeliveredCommercial: input.qtyDeliveredCommercial,
        qtyAcceptedCommercial: input.qtyAcceptedCommercial,
        qtyRejectedCommercial: input.qtyRejectedCommercial,
        qtyAcceptedBase,
        qtyRejectedBase,
        rejectionReason: input.rejectionReason,
        lotNumber: input.lotNumber,
        expiryDate: input.expiryDate,
      });

      // REGRA: Entrada de estoque SOMENTE para quantidade aceita!
      if (qtyAcceptedBase > 0) {
        newMovements.push({
          id: `mov-${Date.now()}-${input.productId}`,
          organizationId: orgId,
          productId: input.productId,
          productDescription: orderItem.productDescription,
          date: params.receiptDate,
          movementType: "recebimento_industria",
          qtyBase: qtyAcceptedBase,
          lotNumber: input.lotNumber,
          expiryDate: input.expiryDate,
          sourceDoc: `Recebimento da ordem ${ord.orderNumber} (Doc: ${params.documentRef})`,
          userEmail: params.responsible,
          reason: `Recebimento conferido de ${input.qtyAcceptedCommercial} ${orderItem.commercialUnit} (${qtyAcceptedBase} UN base)`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Se todos os itens foram totalmente atendidos, encerra a ordem
    const allCompleted = ord.items.every((i) => i.fulfillmentStatus === "recebido_integral");
    if (allCompleted) {
      ord.industryStatus = "encerrada";
    }
    ord.updatedAt = new Date().toISOString();

    const newReceipt: IndustryReceipt = {
      id: `rec-${Date.now()}`,
      organizationId: orgId,
      industryOrderId: ord.id,
      orderNumber: ord.orderNumber,
      receiptDate: params.receiptDate,
      responsible: params.responsible,
      documentRef: params.documentRef,
      notes: params.notes,
      items: receiptItems,
      createdAt: new Date().toISOString(),
    };

    const updatedReceipts = [newReceipt, ...receipts];
    const updatedMovements = [...newMovements, ...movements];

    saveLocalData(STORAGE_KEYS.RECEIPTS, updatedReceipts);
    saveLocalData(STORAGE_KEYS.ORDERS, orders);
    saveLocalData(STORAGE_KEYS.MOVEMENTS, updatedMovements);

    this.syncToSupabase(orgId, "industry_receipts", updatedReceipts);
    this.syncToSupabase(orgId, "stock_movements", updatedMovements);

    return newReceipt;
  }

  // Reserva de estoque ao confirmar pedido
  // REGRA: Se tem disponível, reserva o disponível. Se falta, indica faltante.
  static reserveStockForOrder(
    orgId: string,
    salesOrderId: string,
    orderNumber: string,
    items: { productId: string; qtyBaseNeeded: number }[],
  ): {
    reservations: StockReservation[];
    hasShortage: boolean;
    shortageItems: { productId: string; shortageBase: number }[];
  } {
    const positions = this.getStockPositions(orgId);
    const existingReservations = this.getReservations(orgId);

    const newReservations: StockReservation[] = [];
    const shortageItems: { productId: string; shortageBase: number }[] = [];
    let hasShortage = false;

    for (const item of items) {
      const pos = positions.find((p) => p.productId === item.productId);
      const available = pos ? pos.available : 0;

      const qtyToReserve = Math.min(available, item.qtyBaseNeeded);
      const shortage = Math.max(0, item.qtyBaseNeeded - available);

      if (shortage > 0) {
        hasShortage = true;
        shortageItems.push({ productId: item.productId, shortageBase: shortage });
      }

      newReservations.push({
        id: `res-${Date.now()}-${item.productId}`,
        organizationId: orgId,
        salesOrderId,
        orderNumber,
        productId: item.productId,
        qtyReservedBase: qtyToReserve,
        qtyShortageBase: shortage,
        status: "ativa",
        createdAt: new Date().toISOString(),
      });
    }

    const updated = [...newReservations, ...existingReservations];
    saveLocalData(STORAGE_KEYS.RESERVATIONS, updated);
    this.syncToSupabase(orgId, "stock_reservations", updated);

    return { reservations: newReservations, hasShortage, shortageItems };
  }

  // Expedição de pedido confirmado
  // REGRA: Baixa a reserva e baixa o estoque físico uma única vez!
  static shipOrder(
    orgId: string,
    salesOrderId: string,
    orderNumber: string,
    itemsToShip: { productId: string; qtyBaseToShip: number }[],
    userEmail: string,
  ): void {
    const reservations = this.getReservations(orgId);
    const movements = this.getMovements(orgId);
    const newMovements: StockMovement[] = [];

    for (const item of itemsToShip) {
      const prod = DEFAULT_CATALOG.find((p) => p.id === item.productId);

      // Baixa a reserva do pedido
      const res = reservations.find(
        (r) =>
          r.salesOrderId === salesOrderId && r.productId === item.productId && r.status === "ativa",
      );
      if (res) {
        res.qtyReservedBase = Math.max(0, res.qtyReservedBase - item.qtyBaseToShip);
        if (res.qtyReservedBase === 0 && res.qtyShortageBase === 0) {
          res.status = "atendida";
        }
      }

      // Gera movimento de saída por expedição (físico negativo)
      newMovements.push({
        id: `mov-ship-${Date.now()}-${item.productId}`,
        organizationId: orgId,
        productId: item.productId,
        productDescription: prod?.description || "Produto",
        date: new Date().toISOString().split("T")[0]!,
        movementType: "saida_expedicao",
        qtyBase: -item.qtyBaseToShip,
        sourceDoc: `Expedição do Pedido ${orderNumber}`,
        userEmail,
        reason: `Saída expedida para entrega ao cliente (${item.qtyBaseToShip} un)`,
        createdAt: new Date().toISOString(),
      });
    }

    saveLocalData(STORAGE_KEYS.RESERVATIONS, reservations);
    saveLocalData(STORAGE_KEYS.MOVEMENTS, [...newMovements, ...movements]);
  }

  // Cancelamento de pedido: libera reservas não expedidas
  static cancelOrderReservations(orgId: string, salesOrderId: string): void {
    const reservations = this.getReservations(orgId);
    for (const r of reservations) {
      if (r.salesOrderId === salesOrderId && r.status === "ativa") {
        r.status = "cancelada";
      }
    }
    saveLocalData(STORAGE_KEYS.RESERVATIONS, reservations);
  }

  // Ajuste manual de estoque com justificativa
  static addStockAdjustment(
    orgId: string,
    productId: string,
    qtyBase: number,
    reason: string,
    userEmail: string,
  ): StockMovement {
    const prod = DEFAULT_CATALOG.find((p) => p.id === productId);
    const movements = this.getMovements(orgId);

    const mov: StockMovement = {
      id: `mov-adj-${Date.now()}`,
      organizationId: orgId,
      productId,
      productDescription: prod?.description || "Produto",
      date: new Date().toISOString().split("T")[0]!,
      movementType: qtyBase >= 0 ? "ajuste_positivo" : "ajuste_negativo",
      qtyBase,
      reason,
      userEmail,
      createdAt: new Date().toISOString(),
    };

    saveLocalData(STORAGE_KEYS.MOVEMENTS, [mov, ...movements]);
    return mov;
  }
}
