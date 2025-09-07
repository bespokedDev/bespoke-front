/* eslint-disable @typescript-eslint/no-explicit-any */ "use client";import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, FileDown, PlusCircle, Trash2, ArrowLeft, UserPlus } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateForDisplay } from "@/lib/dateUtils";

// --- DEFINICIONES DE TIPOS ---

interface ReportDetail {
  enrollmentId: string | null;
  period: string;
  plan: string;
  studentName: string;
  amount: number;
  amountInDollars: number;
  totalHours: number;
  pricePerHour: number;
  pPerHour: number;
  hoursSeen: number | null;
  balance: number | null;
  totalTeacher: number;
  totalBespoke: number;
  balanceRemaining: number;
  status: 1 | 2;
  type: 'normal' | 'substitute' | 'bonus';
  bonusReason?: string;
}

interface ProfessorReport {
  professorId: string;
  professorName: string;
  reportDateRange: string;
  rates: {
    single: number;
    couple: number;
    group: number;
  };
  details: ReportDetail[];
  subtotals: {
    totalTeacher: number;
    totalBespoke: number;
    balanceRemaining: number;
  };
}

interface SpecialReportDetail {
  enrollmentId: string | null;
  period: string;
  plan: string;
  studentName: string;
  amount: number;
  amountInDollars: number;
  totalHours: number;
  pricePerHour: number;
  pPerHour: number;
  hoursSeen: number | null;
  oldBalance: number | null;
  payment: number | null;
  total: number;
  balanceRemaining: number;
  type: 'normal' | 'substitute' | 'bonus';
  bonusReason?: string;
}

interface SpecialProfessorReport {
  professorId: string;
  professorName: string;
  reportDateRange: string;
  rates: {
    single: number;
    couple: number;
    group: number;
  };
  details: SpecialReportDetail[];
  subtotal: {
    total: number;
    balanceRemaining: number;
  };
}

interface ExcedentDetail {
  incomeId: string;
  deposit_name: string;
  amount: number;
  amountInDollars: number;
  tasa: number;
  divisa: string;
  paymentMethod: string;
  note: string;
  income_date: string;
  createdAt: string;
}

interface ExcedentReport {
  reportDateRange: string;
  totalExcedente: number;
  numberOfIncomes: number;
  details: ExcedentDetail[];
}

interface ExcedentRow {
  id: string;
  enrollmentId: string;
  studentName: string;
  amount: number | null;
  amountInDollars: number | null;
  hoursSeen: number | null;
  pricePerHour: number | null;
  total: number;
  notes: string;
}

interface EnrollmentForSelect {
  _id: string;
  studentIds: { name: string; alias?: string }[];
  planId: { name: string };
  enrollmentType: 'single' | 'couple' | 'group';
  initialBalance?: number;
}

interface EnrollmentBalance {
  enrollmentId: string;
  studentName: string;
  planName: string;
  totalAvailable: number;
  usedInNormal: number;
  usedInSubstitutes: number;
  remaining: number;
}

interface ReportState {
  general: ProfessorReport[];
  special: SpecialProfessorReport | null;
  excedente: ExcedentReport | null;
}

function NewReportComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const month = searchParams.get("month");

  const [reportData, setReportData] = useState<ReportState | null>(null);
  const [excedents, setExcedents] = useState<ExcedentRow[]>([]);
  const [realTotal, setRealTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentForSelect[]>([]);
  const [enrollmentBalances, setEnrollmentBalances] = useState<EnrollmentBalance[]>([]);
  const [openSelectors, setOpenSelectors] = useState<{[key: string]: boolean}>({});

  const handleGenerateReport = async (reportMonth: string) => {
    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      const response = await apiClient(
        `api/incomes/professors-payout-report?month=${reportMonth}`
      );

      console.log("response", response);

      const initialGeneralReport = response.report.map((prof: any) => ({
        ...prof,
        details: prof.details.map((detail: any) => ({
          ...detail,
          amountInDollars: detail.amountInDollars || (detail.amount || 0),
          hoursSeen: null, // Inicializar como null en lugar de 0
          balance: null,   // Inicializar como null en lugar de 0
          type: 'normal',  // Tipo por defecto para registros existentes
        })),
        subtotals: { totalTeacher: 0, totalBespoke: 0, balanceRemaining: 0 },
      }));

      const initialSpecialReport = response.specialProfessorReport
        ? {
            ...response.specialProfessorReport,
            details: response.specialProfessorReport.details.map((detail: any) => ({
              ...detail,
              amountInDollars: detail.amountInDollars || (detail.amount || 0),
              hoursSeen: null,    // Inicializar como null
              oldBalance: null,   // Inicializar como null
              payment: null,      // Inicializar como null
              type: 'normal',     // Tipo por defecto para registros existentes
            })),
            subtotal: { total: 0, balanceRemaining: 0 },
          }
        : null;

      setReportData({
        general: initialGeneralReport,
        special: initialSpecialReport,
        excedente: response.excedente || null,
      });
    } catch (err: any) {
      setError(err.message || "Failed to generate report.");
    } finally {
      setIsLoading(false);
    }
  };

  // Función helper para obtener el valor a mostrar
  const getFieldValue = (value: number | null | undefined) => {
    return value === null || value === undefined ? "" : value;
  };

  // Función helper para obtener el indicador visual del tipo
  const getTypeIndicator = (type: 'normal' | 'substitute' | 'bonus') => {
    switch (type) {
      case 'normal': return '📚'; // Clase normal
      case 'substitute': return '🔄'; // Suplencia
      case 'bonus': return '💰'; // Bono manual
      default: return '';
    }
  };

  // Función helper para obtener el balance disponible de un enrollment
  const getEnrollmentBalance = (enrollmentId: string | null) => {
    if (!enrollmentId) return 0;
    const balance = enrollmentBalances.find(b => b.enrollmentId === enrollmentId);
    return balance?.remaining || 0;
  };

  // Función helper para formatear el nombre del enrollment
  const formatEnrollmentName = (enrollment: EnrollmentForSelect) => {
    const studentName = enrollment.studentIds[0]?.alias || enrollment.studentIds[0]?.name || '';
    const planName = enrollment.planId.name;
    const typePrefix = enrollment.enrollmentType === 'single' ? 'S' : 
                      enrollment.enrollmentType === 'couple' ? 'C' : 'G';
    return `(${typePrefix} - ${planName}) ${studentName}`;
  };

  // Función helper para obtener el balance remaining correcto de un enrollment
  const getCorrectBalanceRemaining = (enrollmentId: string | null, currentAmount: number) => {
    if (!enrollmentId || !calculatedData) return 0;
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    if (!enrollment) return 0;
    
    // Buscar el enrollment en los datos CALCULADOS para obtener el balance remaining ACTUAL
    let currentBalanceRemaining = 0;
    
    // Buscar en reportes generales calculados
    if (calculatedData.generalReport) {
      calculatedData.generalReport.forEach(prof => {
        prof.details.forEach(detail => {
          if (detail.enrollmentId === enrollmentId && detail.type === 'normal') {
            // Usar el balance remaining calculado dinámicamente
            currentBalanceRemaining = detail.balanceRemaining || 0;
          }
        });
      });
    }
    
    // Buscar en reporte especial calculado
    if (calculatedData.specialReport) {
      calculatedData.specialReport.details.forEach(detail => {
        if (detail.enrollmentId === enrollmentId && detail.type === 'normal') {
          // Usar el balance remaining calculado dinámicamente
          currentBalanceRemaining = detail.balanceRemaining || 0;
        }
      });
    }
    
    // Si no se encuentra en los datos calculados, usar el balance inicial del enrollment
    if (currentBalanceRemaining === 0) {
      currentBalanceRemaining = enrollment.initialBalance || 0;
    }
    
    return currentBalanceRemaining;
  };

  // Función helper para obtener el balance disponible considerando todas las suplencias previas
  const getAvailableBalanceForSubstitute = (enrollmentId: string | null, excludeCurrentSubstitute?: {profIndex: number, detailIndex: number}) => {
    if (!enrollmentId || !calculatedData) return 0;
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    if (!enrollment) return 0;
    
    // Obtener el balance remaining de la clase normal
    let baseBalance = getCorrectBalanceRemaining(enrollmentId, 0);
    
    // Restar todas las suplencias previas del mismo enrollment
    if (calculatedData.generalReport) {
      calculatedData.generalReport.forEach((prof, profIndex) => {
        prof.details.forEach((detail, detailIndex) => {
          if (detail.enrollmentId === enrollmentId && 
              detail.type === 'substitute' && 
              !(excludeCurrentSubstitute && excludeCurrentSubstitute.profIndex === profIndex && excludeCurrentSubstitute.detailIndex === detailIndex)) {
            // Restar el total de la suplencia (hoursSeen * pricePerHour)
            const substituteTotal = (detail.hoursSeen || 0) * (detail.pricePerHour || 0);
            baseBalance -= substituteTotal;
          }
        });
      });
    }
    
    if (calculatedData.specialReport) {
      calculatedData.specialReport.details.forEach((detail, detailIndex) => {
        if (detail.enrollmentId === enrollmentId && 
            detail.type === 'substitute' && 
            !(excludeCurrentSubstitute && excludeCurrentSubstitute.profIndex === -1 && excludeCurrentSubstitute.detailIndex === detailIndex)) {
          // Restar el total de la suplencia (payment)
          const substituteTotal = detail.payment || 0;
          baseBalance -= substituteTotal;
        }
      });
    }
    
    return Math.max(0, baseBalance); // No permitir balance negativo
  };

  // Función helper para obtener el balance disponible considerando suplencias previas (versión mejorada)
  const getAvailableBalanceForSubstituteV2 = (enrollmentId: string | null, excludeCurrentSubstitute?: {profIndex: number, detailIndex: number}) => {
    if (!enrollmentId || !reportData) return 0;
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    if (!enrollment) return 0;
    
    // Obtener el balance remaining de la clase normal desde los datos originales
    let baseBalance = 0;
    
    // Buscar en reportes generales
    if (reportData.general) {
      reportData.general.forEach(prof => {
        prof.details.forEach(detail => {
          if (detail.enrollmentId === enrollmentId && detail.type === 'normal') {
            // Calcular el balance remaining basado en las horas vistas
            const totalHours = detail.totalHours || 0;
            const hoursSeen = detail.hoursSeen || 0;
            const pricePerHour = detail.pricePerHour || 0;
            const amountInDollars = detail.amountInDollars || 0;
            const balance = detail.balance || 0;
            
            // Balance remaining = amount + balance - (hoursSeen * pricePerHour)
            baseBalance = amountInDollars + balance - (hoursSeen * pricePerHour);
          }
        });
      });
    }
    
    // Buscar en reporte especial
    if (reportData.special) {
      reportData.special.details.forEach(detail => {
        if (detail.enrollmentId === enrollmentId && detail.type === 'normal') {
          const amountInDollars = detail.amountInDollars || 0;
          const payment = detail.payment || 0;
          baseBalance = amountInDollars - payment;
        }
      });
    }
    
    // Si no se encuentra, usar el balance inicial del enrollment
    if (baseBalance === 0) {
      baseBalance = enrollment.initialBalance || 0;
    }
    
    // Restar todas las suplencias previas del mismo enrollment
    if (reportData.general) {
      reportData.general.forEach((prof, profIndex) => {
        prof.details.forEach((detail, detailIndex) => {
          if (detail.enrollmentId === enrollmentId && 
              detail.type === 'substitute' && 
              !(excludeCurrentSubstitute && excludeCurrentSubstitute.profIndex === profIndex && excludeCurrentSubstitute.detailIndex === detailIndex)) {
            // Restar el total de la suplencia (hoursSeen * pricePerHour)
            const substituteTotal = (detail.hoursSeen || 0) * (detail.pricePerHour || 0);
            baseBalance -= substituteTotal;
          }
        });
      });
    }
    
    if (reportData.special) {
      reportData.special.details.forEach((detail, detailIndex) => {
        if (detail.enrollmentId === enrollmentId && 
            detail.type === 'substitute' && 
            !(excludeCurrentSubstitute && excludeCurrentSubstitute.profIndex === -1 && excludeCurrentSubstitute.detailIndex === detailIndex)) {
          // Restar el total de la suplencia (payment)
          const substituteTotal = detail.payment || 0;
          baseBalance -= substituteTotal;
        }
      });
    }
    
    return Math.max(0, baseBalance); // No permitir balance negativo
  };

  // Función helper para obtener el pPerHour del profesor actual basado en el tipo de enrollment
  const getCurrentProfessorPayPerHour = (profIndex: number, enrollmentId: string | null, isSpecial: boolean = false) => {
    if (!enrollmentId) return 0;
    
    // Obtener el enrollment para saber su tipo
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    if (!enrollment) return 0;
    
    if (isSpecial) {
      // Para el profesor especial, usar los rates del reporte especial
      if (reportData?.special?.rates) {
        return reportData.special.rates[enrollment.enrollmentType] || 0;
      }
    } else {
      // Para profesores generales, usar los rates del profesor específico
      if (reportData?.general && reportData.general[profIndex]?.rates) {
        return reportData.general[profIndex].rates[enrollment.enrollmentType] || 0;
      }
    }
    return 0;
  };

  // Función helper para manejar el selector editable
  const handleEnrollmentSelect = (enrollmentId: string, profIndex: number, detailIndex: number, isSpecial: boolean = false) => {
    const selectedEnrollment = enrollments.find(e => e._id === enrollmentId);
    if (!selectedEnrollment) return;

    // Buscar el enrollment en los datos del reporte para obtener la información completa
    let enrollmentData: any = null;
    
    // Buscar en reportes generales
    if (reportData?.general) {
      reportData.general.forEach(prof => {
        prof.details.forEach(detail => {
          if (detail.enrollmentId === enrollmentId && detail.type === 'normal') {
            enrollmentData = detail;
          }
        });
      });
    }
    
    // Buscar en reporte especial
    if (!enrollmentData && reportData?.special) {
      reportData.special.details.forEach(detail => {
        if (detail.enrollmentId === enrollmentId && detail.type === 'normal') {
          enrollmentData = detail;
        }
      });
    }

    if (isSpecial) {
      updateSpecialDetailField(detailIndex, "enrollmentId" as any, enrollmentId);
      updateSpecialDetailField(detailIndex, "studentName" as any, formatEnrollmentName(selectedEnrollment));
      updateSpecialDetailField(detailIndex, "plan" as any, selectedEnrollment.planId.name);
      
      // Llenar campos específicos de suplencia si encontramos los datos del enrollment
      if (enrollmentData) {
        updateSpecialDetailField(detailIndex, "totalHours" as any, enrollmentData.totalHours);
        updateSpecialDetailField(detailIndex, "pricePerHour" as any, enrollmentData.pricePerHour);
        // pPerHour del profesor especial basado en el tipo de enrollment
        updateSpecialDetailField(detailIndex, "pPerHour" as any, getCurrentProfessorPayPerHour(profIndex, enrollmentId, true));
        // amountInDollars no se llena (las suplencias no dependen de ingresos)
        // balance se llena con el balance disponible considerando suplencias previas
        updateSpecialDetailField(detailIndex, "balance" as any, getAvailableBalanceForSubstituteV2(enrollmentId, {profIndex: -1, detailIndex}));
      }
    } else {
      updateDetailField(profIndex, detailIndex, "enrollmentId", enrollmentId);
      updateDetailField(profIndex, detailIndex, "studentName", formatEnrollmentName(selectedEnrollment));
      updateDetailField(profIndex, detailIndex, "plan", selectedEnrollment.planId.name);
      
      // Llenar campos específicos de suplencia si encontramos los datos del enrollment
      if (enrollmentData) {
        updateDetailField(profIndex, detailIndex, "totalHours", enrollmentData.totalHours);
        updateDetailField(profIndex, detailIndex, "pricePerHour", enrollmentData.pricePerHour);
        // pPerHour del profesor actual que está haciendo la suplencia basado en el tipo de enrollment
        updateDetailField(profIndex, detailIndex, "pPerHour", getCurrentProfessorPayPerHour(profIndex, enrollmentId, false));
        // amountInDollars no se llena (las suplencias no dependen de ingresos)
        // balance se llena con el balance disponible considerando suplencias previas
        updateDetailField(profIndex, detailIndex, "balance", getAvailableBalanceForSubstituteV2(enrollmentId, {profIndex, detailIndex}));
      }
    }
  };

  // Función para calcular balances dinámicos por enrollment
  const calculateEnrollmentBalances = () => {
    const balances: EnrollmentBalance[] = [];
    
    enrollments.forEach(enrollment => {
      let totalUsed = 0;
      let usedInNormal = 0;
      let usedInSubstitutes = 0;
      
      // Sumar uso en clases normales y suplencias de reportes generales
      if (reportData?.general) {
        reportData.general.forEach(prof => {
          prof.details.forEach(detail => {
            if (detail.enrollmentId === enrollment._id) {
              if (detail.type === 'normal') {
                usedInNormal += detail.amountInDollars || 0;
              } else if (detail.type === 'substitute') {
                usedInSubstitutes += detail.amountInDollars || 0;
              }
              totalUsed += detail.amountInDollars || 0;
            }
          });
        });
      }
      
      // Sumar uso en reporte especial
      if (reportData?.special) {
        reportData.special.details.forEach(detail => {
          if (detail.enrollmentId === enrollment._id) {
            if (detail.type === 'normal') {
              usedInNormal += detail.amountInDollars || 0;
            } else if (detail.type === 'substitute') {
              usedInSubstitutes += detail.amountInDollars || 0;
            }
            totalUsed += detail.amountInDollars || 0;
          }
        });
      }
      
      // Sumar uso en excedentes
      excedents.forEach(excedent => {
        if (excedent.enrollmentId === enrollment._id) {
          totalUsed += excedent.amountInDollars || 0;
        }
      });
      
      const initialBalance = enrollment.initialBalance || 0;
      const remaining = initialBalance - totalUsed;
      
      balances.push({
        enrollmentId: enrollment._id,
        studentName: enrollment.studentIds.map(s => s.name).join(", "),
        planName: enrollment.planId.name,
        totalAvailable: initialBalance,
        usedInNormal,
        usedInSubstitutes,
        remaining: Math.max(0, remaining) // No permitir balance negativo
      });
    });
    
    setEnrollmentBalances(balances);
    return balances;
  };

  // Función helper para manejar onChange de inputs numéricos
  const handleNumberInputChange = (
    profIndex: number,
    detailIndex: number,
    field: keyof ReportDetail,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const numValue = value === "" ? null : Number(value);
    
    updateDetailField(profIndex, detailIndex, field, numValue);
  };

  // Función helper para manejar onChange de inputs numéricos del reporte especial
  const handleSpecialNumberInputChange = (
    detailIndex: number,
    field: keyof SpecialReportDetail,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const numValue = value === "" ? null : Number(value);
    
    updateSpecialDetailField(detailIndex, field, numValue);
  };

  // Función helper para manejar onChange de inputs numéricos de excedentes
  const handleExcedentNumberInputChange = (
    rowIndex: number,
    field: keyof ExcedentRow,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const numValue = value === "" ? null : Number(value);
    
    updateExcedentField(rowIndex, field, numValue);
  };

  useEffect(() => {
    apiClient("api/enrollments").then(setEnrollments).catch(console.error);
    if (month) {
      handleGenerateReport(month);
    } else {
      setError("Month parameter is missing from URL.");
      setIsLoading(false);
    }
  }, [month]);

  // Recalcular balances cuando cambien los datos
  useEffect(() => {
    if (reportData && enrollments.length > 0) {
      calculateEnrollmentBalances();
    }
  }, [reportData, excedents, enrollments]);

  const calculatedData = useMemo(() => {
    if (!reportData) return null;

    let grandTotalTeacher = 0,
      grandTotalBespoke = 0,
      grandTotalBalanceRemaining = 0;

    const updatedGeneralReport = reportData.general.map((profReport) => {
      let subTotalTeacher = 0,
        subTotalBespoke = 0,
        subTotalBalanceRemaining = 0;
      const updatedDetails = profReport.details.map((detail) => {
        let totalTeacher = 0,
          totalBespoke = 0,
          balanceRemaining = 0;
        if (detail.status === 1) {
          totalTeacher = (detail.hoursSeen || 0) * detail.pPerHour;
          totalBespoke = detail.pricePerHour * (detail.hoursSeen || 0) - totalTeacher;
          balanceRemaining =
            (detail.amountInDollars || 0) + (detail.balance || 0) - totalTeacher - totalBespoke;
        } else {
          totalTeacher = detail.amountInDollars || 0;
          totalBespoke = 0;
          balanceRemaining = 0;
        }
        subTotalTeacher += totalTeacher;
        subTotalBespoke += totalBespoke;
        subTotalBalanceRemaining += balanceRemaining;
        return { ...detail, totalTeacher, totalBespoke, balanceRemaining };
      });
      grandTotalTeacher += subTotalTeacher;
      grandTotalBespoke += subTotalBespoke;
      grandTotalBalanceRemaining += subTotalBalanceRemaining;
      return {
        ...profReport,
        details: updatedDetails,
        subtotals: {
          totalTeacher: subTotalTeacher,
          totalBespoke: subTotalBespoke,
          balanceRemaining: subTotalBalanceRemaining,
        },
      };
    });

    let updatedSpecialReport = null;
    if (reportData.special) {
      let subTotal = 0;
      let subTotalBalanceRemaining = 0;

      const updatedDetails = reportData.special.details.map((detail) => {
        const total = detail.payment || 0;
        const balanceRemaining = (detail.amountInDollars || 0) - (detail.payment || 0);
        subTotal += total;
        subTotalBalanceRemaining += balanceRemaining;
        return { ...detail, total, balanceRemaining };
      });

      updatedSpecialReport = {
        ...reportData.special,
        details: updatedDetails,
        subtotal: {
          total: subTotal,
          balanceRemaining: subTotalBalanceRemaining,
        },
      };
    }

    const excedentsTotal = reportData.excedente?.totalExcedente || 0;

    const specialBalanceRemaining =
      updatedSpecialReport?.subtotal.balanceRemaining || 0;
    const systemTotal =
      grandTotalBalanceRemaining + specialBalanceRemaining + excedentsTotal;

    const difference = systemTotal - realTotal;

    return {
      generalReport: updatedGeneralReport,
      specialReport: updatedSpecialReport,
      excedentsTotal,
      grandTotals: {
        grandTotalTeacher,
        grandTotalBespoke,
        grandTotalBalanceRemaining,
      },
      summary: { systemTotal, difference },
    };
  }, [reportData, excedents, realTotal]);

  const updateDetailField = <K extends keyof ReportDetail>(
    profIndex: number,
    detailIndex: number,
    field: K,
    value: ReportDetail[K]
  ) => {
    if (!reportData) return;
    const newData = { ...reportData };
    (newData.general[profIndex].details[detailIndex][field] as any) = value;
    setReportData(newData);
  };

  const updateSpecialDetailField = <K extends keyof SpecialReportDetail>(
    detailIndex: number,
    field: K,
    value: SpecialReportDetail[K]
  ) => {
    if (!reportData?.special) return;
    const newReportData = { ...reportData };
    if (newReportData.special) {
      (newReportData.special.details[detailIndex][field] as any) = value;
      setReportData(newReportData);
    }
  };

  const addBonus = (profIndex: number) => {
    if (!reportData) return;
    const newData = { ...reportData };
    const reportPeriod = newData.general[profIndex]?.reportDateRange || "N/A";
    const periodWithoutYear = reportPeriod.replace(/\s\d{4}/g, "");
    const newBonus: ReportDetail = {
      enrollmentId: null,
      period: periodWithoutYear,
      plan: "N/A",
      studentName: "Bono Manual",
      amount: 0,
      amountInDollars: 0,
      totalHours: 0,
      pricePerHour: 0,
      pPerHour: 0,
      hoursSeen: null,
      balance: null,
      totalTeacher: 0,
      totalBespoke: 0,
      balanceRemaining: 0,
      status: 2,
      type: 'bonus',
      bonusReason: '',
    };
    newData.general[profIndex].details.push(newBonus);
    setReportData(newData);
  };

  const addSubstitute = (profIndex: number) => {
    if (!reportData) return;
    const newData = { ...reportData };
    const reportPeriod = newData.general[profIndex]?.reportDateRange || "N/A";
    const periodWithoutYear = reportPeriod.replace(/\s\d{4}/g, "");
    const newSubstitute: ReportDetail = {
      enrollmentId: "",
      period: periodWithoutYear,
      plan: "",
      studentName: "",
      amount: 0,
      amountInDollars: 0,
      totalHours: 0,
      pricePerHour: 0,
      pPerHour: 0,
      hoursSeen: null,
      balance: null,
      totalTeacher: 0,
      totalBespoke: 0,
      balanceRemaining: 0,
      status: 1,
      type: 'substitute',
    };
    newData.general[profIndex].details.push(newSubstitute);
    setReportData(newData);
  };

  const removeBonus = (profIndex: number, detailIndex: number) => {
    if (!reportData) return;
    const newData = { ...reportData };
    if (newData.general[profIndex]?.details) {
      newData.general[profIndex].details.splice(detailIndex, 1);
      setReportData(newData);
    }
  };

  const addSpecialBonus = () => {
    if (!reportData?.special) return;
    const newData = { ...reportData };
    const reportPeriod = newData.special?.reportDateRange || "N/A";
    const periodWithoutYear = reportPeriod.replace(/\s\d{4}/g, "");
    const newBonus: SpecialReportDetail = {
      enrollmentId: null,
      period: periodWithoutYear,
      plan: "N/A",
      studentName: "Bono Manual",
      amount: 0,
      amountInDollars: 0,
      totalHours: 0,
      pricePerHour: 0,
      pPerHour: 0,
      hoursSeen: null,
      oldBalance: null,
      payment: null,
      total: 0,
      balanceRemaining: 0,
      type: 'bonus',
      bonusReason: '',
    };
    if (newData.special) {
      newData.special.details.push(newBonus);
    }
    setReportData(newData);
  };

  const addSpecialSubstitute = () => {
    if (!reportData?.special) return;
    const newData = { ...reportData };
    const reportPeriod = newData.special?.reportDateRange || "N/A";
    const periodWithoutYear = reportPeriod.replace(/\s\d{4}/g, "");
    const newSubstitute: SpecialReportDetail = {
      enrollmentId: "",
      period: periodWithoutYear,
      plan: "",
      studentName: "",
      amount: 0,
      amountInDollars: 0,
      totalHours: 0,
      pricePerHour: 0,
      pPerHour: 0,
      hoursSeen: null,
      oldBalance: null,
      payment: null,
      total: 0,
      balanceRemaining: 0,
      type: 'substitute',
    };
    if (newData.special) {
      newData.special.details.push(newSubstitute);
    }
    setReportData(newData);
  };

  const removeSpecialBonus = (detailIndex: number) => {
    if (!reportData?.special) return;
    const newData = { ...reportData };
    if (newData.special?.details) {
      newData.special.details.splice(detailIndex, 1);
      setReportData(newData);
    }
  };

  const removeSpecialSubstitute = (detailIndex: number) => {
    if (!reportData?.special) return;
    const newData = { ...reportData };
    if (newData.special?.details) {
      newData.special.details.splice(detailIndex, 1);
      setReportData(newData);
    }
  };

  const addExcedentRow = () => {
    const newRow: ExcedentRow = {
      id: crypto.randomUUID(),
      enrollmentId: "",
      studentName: "",
      amount: null,
      amountInDollars: null,
      hoursSeen: null,
      pricePerHour: null,
      total: 0,
      notes: "",
    };
    setExcedents((prev) => [...prev, newRow]);
  };

  const updateExcedentField = <K extends keyof ExcedentRow>(
    rowIndex: number,
    field: K,
    value: ExcedentRow[K]
  ) => {
    const newExcedents = [...excedents];
    const currentRow = newExcedents[rowIndex];
    (currentRow[field] as any) = value;
    
    if (field === "enrollmentId") {
      const selectedEnrollment = enrollments.find((e) => e._id === value);
      currentRow.studentName = selectedEnrollment ? formatEnrollmentName(selectedEnrollment) : "";
    }
    currentRow.total = (currentRow.hoursSeen || 0) * (currentRow.pricePerHour || 0);
    setExcedents(newExcedents);
  };

  const removeExcedentRow = (id: string) => {
    setExcedents((prev) => prev.filter((row) => row.id !== id));
  };

  const handleGeneratePdf = () => {
    if (!calculatedData || !month) {
      alert("No hay datos de reporte para generar el PDF.");
      return;
    }

    setIsPrinting(true);

    try {
      const doc = new jsPDF({
        orientation: "landscape",
      });
      let finalY = 15;

      doc.setFontSize(18);
      doc.text(
        `Accounting Report - ${format(new Date(month + "-02"), "MMMM yyyy")}`,
        14,
        finalY
      );
      finalY += 10;

      // --- Tablas de Profesores Generales ---
      calculatedData.generalReport.forEach((prof) => {
        if (finalY > 20) finalY += 5;
        doc.setFontSize(14);
        doc.text(prof.professorName, 14, finalY);
        finalY += 8;

        autoTable(doc, {
          startY: finalY,
          head: [
            [
              "Period",
              "Plan",
              "Student",
              "Amount",
              "Total Hrs",
              "Price/Hr",
              "Hrs Seen",
              "Pay/Hr",
              "Balance",
              "Type",
              "T. Teacher",
              "T. Bespoke",
              "Bal. Rem.",
            ],
          ],
          body: prof.details.map((d) => [
            d.period,
            d.plan,
            d.studentName,
            `$${(d.amountInDollars || 0).toFixed(2)}`,
            d.totalHours,
            `$${d.pricePerHour.toFixed(2)}`,
            d.hoursSeen || "",
            `$${d.pPerHour.toFixed(2)}`,
            `$${(d.balance || 0).toFixed(2)}`,
            d.type === 'normal' ? 'Normal' : d.type === 'substitute' ? 'Substitute' : 'Bonus',
            `$${d.totalTeacher.toFixed(2)}`,
            `$${d.totalBespoke.toFixed(2)}`,
            `$${d.balanceRemaining.toFixed(2)}`,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Subtotals",
                colSpan: 10,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${prof.subtotals.totalTeacher.toFixed(2)}`,
              `$${prof.subtotals.totalBespoke.toFixed(2)}`,
              `$${prof.subtotals.balanceRemaining.toFixed(2)}`,
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          headStyles: { fillColor: [76, 84, 158] },
          styles: { fontSize: 7, cellPadding: 1.5 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      });

      // --- Tabla de Profesor Especial ---
      if (calculatedData.specialReport) {
        finalY += 5;
        doc.setFontSize(14);
        doc.text(
          `${calculatedData.specialReport.professorName} (Special)`,
          14,
          finalY
        );
        finalY += 8;

        autoTable(doc, {
          startY: finalY,
          head: [
            [
              "Period",
              "Plan",
              "Student",
              "Amount",
              "Total Hrs",
              "Hrs Seen",
              "Balance",
              "Payment",
              "Type",
              "Total",
              "Bal. Rem.",
            ],
          ],
          body: calculatedData.specialReport.details.map((d) => [
            d.period,
            d.plan,
            d.studentName,
            `$${(d.amountInDollars || 0).toFixed(2)}`,
            d.totalHours,
            d.hoursSeen || "",
            `$${(d.oldBalance || 0).toFixed(2)}`,
            `$${(d.payment || 0).toFixed(2)}`,
            d.type === 'normal' ? 'Normal' : d.type === 'substitute' ? 'Substitute' : 'Bonus',
            `$${d.total.toFixed(2)}`,
            `$${d.balanceRemaining.toFixed(2)}`,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Subtotals",
                colSpan: 9,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${calculatedData.specialReport.subtotal.total.toFixed(2)}`,
              `$${calculatedData.specialReport.subtotal.balanceRemaining.toFixed(
                2
              )}`,
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          headStyles: { fillColor: [81, 185, 162] },
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Tabla de Excedentes ---
      if (excedents.length > 0) {
        finalY += 5;
        doc.setFontSize(14);
        doc.text("Excedents", 14, finalY);
        finalY += 8;

        autoTable(doc, {
          startY: finalY,
          head: [
            ["Student", "Amount", "Hrs Seen", "Price/Hr", "Total", "Notes"],
          ],
          body: excedents.map((e) => [
            e.studentName,
            `$${(e.amountInDollars || 0).toFixed(2)}`,
            e.hoursSeen || "",
            `$${(e.pricePerHour || 0).toFixed(2)}`,
            `$${e.total.toFixed(2)}`,
            e.notes,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Total Excedents",
                colSpan: 4,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${calculatedData.excedentsTotal.toFixed(2)}`,
              "",
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Resumen Final ---
      finalY += 5;
      doc.setFontSize(14);
      doc.text("Final Summary", 14, finalY);
      finalY += 8;

      autoTable(doc, {
        startY: finalY,
        head: [["Concept", "Value"]],
        body: [
          ["System Total", `$${calculatedData.summary.systemTotal.toFixed(2)}`],
          ["Real Total (Bank)", `$${realTotal.toFixed(2)}`],
          ["Difference", `$${calculatedData.summary.difference.toFixed(2)}`],
        ],
        theme: "striped",
        headStyles: { fillColor: [41, 41, 41] },
      });

      doc.save(`report-${month}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSaveReport = async () => {
    if (!calculatedData) {
      alert("Report data is not available.");
      return;
    }
    setIsSaving(true);
    const payload = {
      month: month,
      report: calculatedData.generalReport,
      specialProfessorReport: calculatedData.specialReport,
      excedents: { rows: excedents, total: calculatedData.excedentsTotal },
      enrollmentBalances: enrollmentBalances.map(balance => ({
        enrollmentId: balance.enrollmentId,
        balanceRemaining: balance.remaining
      })),
      summary: {
        systemTotal: calculatedData.summary.systemTotal,
        realTotal: realTotal,
        difference: calculatedData.summary.difference,
      },
    };
    try {
      const response = await apiClient("api/general-payment-tracker", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert(
        response.message ||
          "Reporte guardado exitosamente. El PDF se generará a continuación."
      );
      await handleGeneratePdf();
      router.push("/accounting/report");
    } catch (err: any) {
      console.error("Failed to save report:", err);
      alert(`Error saving report: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />{" "}
        <p className="text-xl ml-4">Generating report for {month}...</p>
      </div>
    );
  if (error) return <p className="text-destructive text-center p-8">{error}</p>;
  if (!calculatedData)
    return <p className="text-center p-8">No report data to display.</p>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={`New Report: ${
          month ? format(new Date(month + "-02"), "MMMM yyyy") : ""
        }`}
        subtitle="Fill in or modify the details below to calculate and save the report."
      >
        <Button
          variant="outline"
          onClick={() => router.push("/accounting/report")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel and Go Back
        </Button>
      </PageHeader>
      <div
        id="report-to-print"
        className="space-y-8 bg-white p-4 sm:p-6 rounded-lg"
      >
        {calculatedData.generalReport.map((profReport, profIndex) => (
          <Card key={profReport.professorId}>
            <CardHeader>
              <CardTitle className="text-lg">
                {profReport.professorName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Period</TableHead>
                      <TableHead className="w-[150px]">Plan</TableHead>
                      <TableHead className="w-[180px]">Student</TableHead>
                      <TableHead className="w-[110px]">Amount</TableHead>
                      <TableHead className="w-[110px]">Total Hours</TableHead>
                      <TableHead className="w-[110px]">Price/Hour</TableHead>
                      <TableHead className="w-[110px]">Hours Seen</TableHead>
                      <TableHead className="w-[110px]">Pay/Hour</TableHead>
                      <TableHead className="w-[110px]">Balance</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">
                        Total Teacher
                      </TableHead>
                      <TableHead className="text-right">
                        Total Bespoke
                      </TableHead>
                      <TableHead className="text-right">Balance Rem.</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profReport.details.map((detail, detailIndex) => (
                      <TableRow
                        key={detail.enrollmentId || `bonus-${detailIndex}`}
                      >
                        <TableCell className="px-3">{detail.period}</TableCell>
                        <TableCell>
                          {detail.type === 'normal' ? (
                            <span className="px-1">{detail.plan}</span>
                          ) : (
                            <Input
                              value={detail.plan}
                              onChange={(e) =>
                                updateDetailField(
                                  profIndex,
                                  detailIndex,
                                  "plan",
                                  e.target.value
                                )
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {detail.type === 'normal' ? (
                            <span className="font-medium px-1">
                              {detail.studentName}
                            </span>
                          ) : detail.type === 'substitute' ? (
                            <Popover
                              open={openSelectors[`general-${profIndex}-${detailIndex}`] || false}
                              onOpenChange={(open) => 
                                setOpenSelectors(prev => ({
                                  ...prev,
                                  [`general-${profIndex}-${detailIndex}`]: open
                                }))
                              }
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openSelectors[`general-${profIndex}-${detailIndex}`]}
                                  className="w-full justify-between"
                                >
                                  {detail.enrollmentId ? 
                                    formatEnrollmentName(enrollments.find(e => e._id === detail.enrollmentId)!) :
                                    "Search student..."
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0">
                                <Command>
                                  <CommandInput placeholder="Search student..." />
                                  <CommandList>
                                    <CommandEmpty>No student found.</CommandEmpty>
                                    <CommandGroup>
                                      {enrollments.map((enrollment) => (
                                        <CommandItem
                                          key={enrollment._id}
                                          value={formatEnrollmentName(enrollment)}
                                          onSelect={() => {
                                            handleEnrollmentSelect(enrollment._id, profIndex, detailIndex, false);
                                            setOpenSelectors(prev => ({
                                              ...prev,
                                              [`general-${profIndex}-${detailIndex}`]: false
                                            }));
                                          }}
                                        >
                                          {formatEnrollmentName(enrollment)}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Input
                              value={detail.studentName}
                              onChange={(e) =>
                                updateDetailField(
                                  profIndex,
                                  detailIndex,
                                  "studentName",
                                  e.target.value
                                )
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getFieldValue(detail.amountInDollars)}
                            onChange={(e) =>
                              handleNumberInputChange(
                                profIndex,
                                detailIndex,
                                "amountInDollars",
                                e
                              )
                            }
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getFieldValue(detail.totalHours)}
                            onChange={(e) =>
                              handleNumberInputChange(
                                profIndex,
                                detailIndex,
                                "totalHours",
                                e
                              )
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getFieldValue(detail.pricePerHour)}
                            onChange={(e) =>
                              handleNumberInputChange(
                                profIndex,
                                detailIndex,
                                "pricePerHour",
                                e
                              )
                            }
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getFieldValue(detail.hoursSeen)}
                            onChange={(e) =>
                              handleNumberInputChange(
                                profIndex,
                                detailIndex,
                                "hoursSeen",
                                e
                              )
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getFieldValue(detail.pPerHour)}
                            onChange={(e) =>
                              handleNumberInputChange(
                                profIndex,
                                detailIndex,
                                "pPerHour",
                                e
                              )
                            }
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={getFieldValue(detail.balance)}
                            onChange={(e) =>
                              handleNumberInputChange(
                                profIndex,
                                detailIndex,
                                "balance",
                                e
                              )
                            }
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg" title={
                            detail.type === 'normal' ? 'Clase Normal' :
                            detail.type === 'substitute' ? 'Suplencia' : 'Bono Manual'
                          }>
                            {getTypeIndicator(detail.type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {detail.totalTeacher.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {detail.totalBespoke.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {detail.balanceRemaining.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {(detail.type === 'bonus' || detail.type === 'substitute') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                detail.type === 'bonus' ? 
                                  removeBonus(profIndex, detailIndex) :
                                  removeBonus(profIndex, detailIndex) // TODO: Crear removeSubstitute
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSubstitute(profIndex)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Substitute
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addBonus(profIndex)}
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Bonus
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {profReport.subtotals.totalTeacher.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {profReport.subtotals.totalBespoke.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-blue-600">
                        {profReport.subtotals.balanceRemaining.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}

        {calculatedData.specialReport && (
          <Card key={calculatedData.specialReport.professorId}>
            <CardHeader>
              <CardTitle className="text-lg">
                {calculatedData.specialReport.professorName} (Special)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Period</TableHead>
                      <TableHead className="w-[150px]">Plan</TableHead>
                      <TableHead className="w-[200px]">Student</TableHead>
                      <TableHead className="w-[120px]">Amount</TableHead>
                      <TableHead className="w-[120px]">Total Hours</TableHead>
                      <TableHead className="w-[120px]">Hours Seen</TableHead>
                      <TableHead className="w-[120px]">Balance</TableHead>
                      <TableHead className="w-[120px]">Payment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance Rem.</TableHead>
                      <TableHead className="w-[60px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedData.specialReport.details.map(
                      (detail, detailIndex) => (
                        <TableRow key={detail.enrollmentId}>
                          <TableCell className="px-3">{detail.period}</TableCell>
                          <TableCell>
                            {detail.type === 'normal' ? (
                              <span className="px-1">{detail.plan}</span>
                            ) : (
                              <Input
                                value={detail.plan}
                                onChange={(e) =>
                                  handleSpecialNumberInputChange(
                                    detailIndex,
                                    "plan" as any,
                                    e as any
                                  )
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {detail.type === 'normal' ? (
                              <span className="font-medium px-1">
                                {detail.studentName}
                              </span>
                            ) : detail.type === 'substitute' ? (
                              <Popover
                                open={openSelectors[`special-${detailIndex}`] || false}
                                onOpenChange={(open) => 
                                  setOpenSelectors(prev => ({
                                    ...prev,
                                    [`special-${detailIndex}`]: open
                                  }))
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openSelectors[`special-${detailIndex}`]}
                                    className="w-full justify-between"
                                  >
                                    {detail.enrollmentId ? 
                                      formatEnrollmentName(enrollments.find(e => e._id === detail.enrollmentId)!) :
                                      "Search student..."
                                    }
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder="Search student..." />
                                    <CommandList>
                                      <CommandEmpty>No student found.</CommandEmpty>
                                      <CommandGroup>
                                        {enrollments.map((enrollment) => (
                                          <CommandItem
                                            key={enrollment._id}
                                            value={formatEnrollmentName(enrollment)}
                                            onSelect={() => {
                                              handleEnrollmentSelect(enrollment._id, 0, detailIndex, true);
                                              setOpenSelectors(prev => ({
                                                ...prev,
                                                [`special-${detailIndex}`]: false
                                              }));
                                            }}
                                          >
                                            {formatEnrollmentName(enrollment)}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Input
                                value={detail.studentName}
                                onChange={(e) =>
                                  handleSpecialNumberInputChange(
                                    detailIndex,
                                    "studentName" as any,
                                    e as any
                                  )
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getFieldValue(detail.amountInDollars)}
                              onChange={(e) =>
                                handleSpecialNumberInputChange(
                                  detailIndex,
                                  "amountInDollars",
                                  e
                                )
                              }
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getFieldValue(detail.totalHours)}
                              onChange={(e) =>
                                handleSpecialNumberInputChange(
                                  detailIndex,
                                  "totalHours",
                                  e
                                )
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getFieldValue(detail.hoursSeen)}
                              onChange={(e) =>
                                handleSpecialNumberInputChange(
                                  detailIndex,
                                  "hoursSeen",
                                  e
                                )
                              }
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getFieldValue(detail.oldBalance)}
                              onChange={(e) =>
                                handleSpecialNumberInputChange(
                                  detailIndex,
                                  "oldBalance",
                                  e
                                )
                              }
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getFieldValue(detail.payment)}
                              onChange={(e) =>
                                handleSpecialNumberInputChange(
                                  detailIndex,
                                  "payment",
                                  e
                                )
                              }
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-lg" title={
                              detail.type === 'normal' ? 'Clase Normal' :
                              detail.type === 'substitute' ? 'Suplencia' : 'Bono Manual'
                            }>
                              {getTypeIndicator(detail.type)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${detail.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {detail.balanceRemaining.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {(detail.type === 'bonus' || detail.type === 'substitute') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  detail.type === 'bonus' ? 
                                    removeSpecialBonus(detailIndex) :
                                    removeSpecialSubstitute(detailIndex)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={9}>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSpecialSubstitute()}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Substitute
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSpecialBonus()}
                          >
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Bonus
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        ${calculatedData.specialReport.subtotal.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-blue-600">
                        ${calculatedData.specialReport.subtotal.balanceRemaining.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {reportData?.excedente && (
          <Card>
            <CardHeader>
              <CardTitle>Excedents</CardTitle>
              <p className="text-sm text-muted-foreground">
                {reportData.excedente.reportDateRange} - {reportData.excedente.numberOfIncomes} incomes
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Deposit Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Amount (USD)</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.excedente.details.map((detail, index) => (
                    <TableRow key={detail.incomeId}>
                      <TableCell>{formatDateForDisplay(detail.income_date)}</TableCell>
                      <TableCell>{detail.deposit_name}</TableCell>
                      <TableCell>{detail.amount.toFixed(2)}</TableCell>
                      <TableCell>{detail.divisa}</TableCell>
                      <TableCell>${detail.amountInDollars.toFixed(2)}</TableCell>
                      <TableCell>{detail.paymentMethod}</TableCell>
                      <TableCell>{detail.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end font-bold text-lg">
              Total Excedents: ${reportData.excedente.totalExcedente.toFixed(2)}
            </CardFooter>
          </Card>
        )}
        <Card className="max-w-md ml-auto">
          <CardHeader>
            <CardTitle>Final Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Total Balance Remaining:</Label>
              <span className="font-semibold">
                $
                {calculatedData.grandTotals.grandTotalBalanceRemaining.toFixed(
                  2
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label>Total Excedents:</Label>
              <span className="font-semibold">
                ${(reportData?.excedente?.totalExcedente || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <Label className="text-lg font-bold">System Total:</Label>
              <span className="text-lg font-bold">
                ${calculatedData.summary.systemTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="realTotal">Real Total (from bank):</Label>
              <Input
                id="realTotal"
                type="number"
                value={realTotal}
                onChange={(e) => setRealTotal(Number(e.target.value))}
                className="w-32 font-semibold"
              />
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <Label className="text-lg font-bold">Difference:</Label>
              <span
                className={`text-lg font-bold ${
                  calculatedData.summary.difference !== 0
                    ? "text-destructive"
                    : "text-green-600"
                }`}
              >
                ${calculatedData.summary.difference.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="secondary"
          onClick={handleGeneratePdf}
          disabled={isPrinting || isSaving}
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Generate PDF
        </Button>
        <Button onClick={handleSaveReport} disabled={isSaving || isPrinting}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Report
        </Button>
      </div>
    </div>
  );
}

export default function NewReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <NewReportComponent />
    </Suspense>
  );
}
