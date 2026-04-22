"use client";

import { createContext, useContext, useEffect, useReducer, ReactNode, createElement, useCallback } from "react";
import { Settings } from "./types";

// ---- Types ที่ใช้กับ DB ----
export interface DbRoom {
  id: string;
  roomNumber: string;
  floor: string | null;
  rent: number;
  createdAt: string;
  updatedAt: string;
  tenancies?: DbTenancy[];
}

export interface DbTenant {
  id: string;
  name: string;
  phone: string | null;
  idCard: string | null;
  lineId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  tenancies?: DbTenancy[];
}

export interface DbTenancy {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  tenant?: DbTenant;
  room?: DbRoom;
}

export interface DbBillingRecord {
  id: string;
  roomId: string;
  tenantName: string;
  billingMonth: string;
  prevElectric: number;
  currElectric: number;
  prevWater: number;
  currWater: number;
  electricRate: number;
  waterRate: number;
  electricCost: number;
  waterCost: number;
  rent: number;
  otherFee: number;
  otherFeeNote: string;
  total: number;
  isPaid: boolean;
  paidAt: string | null;
  slipRef: string | null;
  slipVerifiedAt: string | null;
  paymentMethod: string | null;     // "slip" | "cash" | null
  paidBy: string | null;            // ชื่อผู้จ่าย
  createdAt: string;
  updatedAt: string;
  room?: DbRoom;
}

// ---- Store State ----
interface State {
  rooms: DbRoom[];
  tenants: DbTenant[];
  records: DbBillingRecord[];
  settings: Settings;
  loading: boolean;
}

type Action =
  | { type: "SET_ROOMS"; payload: DbRoom[] }
  | { type: "SET_TENANTS"; payload: DbTenant[] }
  | { type: "SET_RECORDS"; payload: DbBillingRecord[] }
  | { type: "SET_SETTINGS"; payload: Settings }
  | { type: "SET_LOADING"; value: boolean }
  | { type: "UPSERT_ROOM"; payload: DbRoom }
  | { type: "REMOVE_ROOM"; id: string }
  | { type: "UPSERT_TENANT"; payload: DbTenant }
  | { type: "REMOVE_TENANT"; id: string }
  | { type: "UPSERT_RECORD"; payload: DbBillingRecord }
  | { type: "REMOVE_RECORD"; id: string }
  | { type: "PATCH_RECORD"; id: string; patch: Partial<DbBillingRecord> };

const defaultSettings: Settings = {
  electricRate: 8,
  waterRate: 18,
  apartmentName: "อพาร์ตเมนต์ของฉัน",
  promptPayId: "",
  apartmentAddress: "",
  apartmentPhone: "",
  apartmentLogo: "",
  invoiceFooter: "ขอบคุณที่ชำระตรงเวลา",
  receiptFooter: "ขอบคุณที่ชำระค่าเช่า",
};

const initialState: State = {
  rooms: [],
  tenants: [],
  records: [],
  settings: defaultSettings,
  loading: true,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ROOMS": return { ...state, rooms: action.payload };
    case "SET_TENANTS": return { ...state, tenants: action.payload };
    case "SET_RECORDS": return { ...state, records: action.payload };
    case "SET_SETTINGS": return { ...state, settings: action.payload };
    case "SET_LOADING": return { ...state, loading: action.value };
    case "UPSERT_ROOM": return {
      ...state,
      rooms: state.rooms.find(r => r.id === action.payload.id)
        ? state.rooms.map(r => r.id === action.payload.id ? action.payload : r)
        : [...state.rooms, action.payload],
    };
    case "REMOVE_ROOM": return {
      ...state,
      rooms: state.rooms.filter(r => r.id !== action.id),
      records: state.records.filter(r => r.roomId !== action.id),
    };
    case "UPSERT_TENANT": return {
      ...state,
      tenants: state.tenants.find(t => t.id === action.payload.id)
        ? state.tenants.map(t => t.id === action.payload.id ? action.payload : t)
        : [...state.tenants, action.payload],
    };
    case "REMOVE_TENANT": return { ...state, tenants: state.tenants.filter(t => t.id !== action.id) };
    case "UPSERT_RECORD": return {
      ...state,
      records: state.records.find(r => r.id === action.payload.id)
        ? state.records.map(r => r.id === action.payload.id ? action.payload : r)
        : [...state.records, action.payload],
    };
    case "REMOVE_RECORD": return { ...state, records: state.records.filter(r => r.id !== action.id) };
    case "PATCH_RECORD": return {
      ...state,
      records: state.records.map(r => r.id === action.id ? { ...r, ...action.patch } : r),
    };
    default: return state;
  }
}

const StoreContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  reload: () => Promise<void>;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const reload = useCallback(async () => {
    dispatch({ type: "SET_LOADING", value: true });
    try {
      const safeFetch = (url: string) =>
        fetch(url).catch(() => null);

      const [roomsRes, tenantsRes, recordsRes, settingsRes] = await Promise.all([
        safeFetch("/api/rooms"),
        safeFetch("/api/tenants"),
        safeFetch("/api/billing"),
        safeFetch("/api/settings"),
      ]);
      // ถ้าไม่ได้ login (401) หรือ network fail (null) → ไม่ต้อง parse
      if (![roomsRes, tenantsRes, recordsRes, settingsRes].every(r => r?.ok)) {
        return;
      }
      const [rooms, tenants, records, settings] = await Promise.all([
        roomsRes!.json(),
        tenantsRes!.json(),
        recordsRes!.json(),
        settingsRes!.json(),
      ]);
      dispatch({ type: "SET_ROOMS", payload: rooms });
      dispatch({ type: "SET_TENANTS", payload: tenants });
      dispatch({ type: "SET_RECORDS", payload: records });
      dispatch({ type: "SET_SETTINGS", payload: { ...defaultSettings, ...settings } });
    } catch (e) {
      console.error("reload failed", e);
    } finally {
      dispatch({ type: "SET_LOADING", value: false });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return createElement(StoreContext.Provider, { value: { state, dispatch, reload } }, children);
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// ---- Helpers ----
export function calcBilling(
  prevElectric: number,
  currElectric: number,
  prevWater: number,
  currWater: number,
  rent: number,
  otherFee: number,
  settings: Settings
) {
  const electricUsed = Math.max(0, currElectric - prevElectric);
  const waterUsed = Math.max(0, currWater - prevWater);
  const electricCost = electricUsed * settings.electricRate;
  const waterCost = waterUsed * settings.waterRate;
  const total = electricCost + waterCost + rent + otherFee;
  return { electricUsed, waterUsed, electricCost, waterCost, total };
}

export function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtMonth(ym: string) {
  if (!ym) return "-";
  const [y, m] = ym.split("-");
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
