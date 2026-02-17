import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { Users, Calendar, TrendingUp, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';

export function EstadisticasAdmin() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [stats, setStats] = useState({
    totalPacientes: 0,
    totalNutriologos: 0,
    citasMes: 0,
    ingresosMes: 0,
  });

  const [visitasPorMes, setVisitasPorMes] = useState([]);
  const [ingresosPorMes, setIngresosPorMes] = useState([]);
  const [rendimientoNutriologos, setRendimientoNutriologos] = useState([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      console.log('[ESTADISTICAS] Iniciando carga con RPCs...');

      // 1. Total pacientes activos
      const { count: totalPacientes, error: errP } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      if (errP) throw errP;

      // 2. Total nutriólogos activos
      const { count: totalNutriologos, error: errN } = await supabase
        .from('nutriologos')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      if (errN) throw errN;

      // 3. Citas e ingresos del mes actual (consulta simple, sin RPC)
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19);

      const { data: citasMesData, error: errC } = await supabase
        .from('citas')
        .select('fecha_hora')
        .gte('fecha_hora', currentMonthStart)
        .lte('fecha_hora', currentMonthEnd);

      if (errC) throw errC;
      const citasMes = citasMesData?.length || 0;

      const { data: pagosMesData, error: errPag } = await supabase
        .from('pagos')
        .select('monto')
        .eq('estado', 'completado')
        .gte('fecha_pago', currentMonthStart)
        .lte('fecha_pago', currentMonthEnd);

      if (errPag) throw errPag;
      const ingresosMes = pagosMesData?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;

      // 4. Gráficas mensuales con RPC (una sola llamada para últimos 6 meses)
      console.log('[ESTADISTICAS] Llamando RPC get_monthly_stats...');
      const { data: monthlyStats, error: errMonthly } = await supabase
        .rpc('get_monthly_stats', { last_months: 6 });

      if (errMonthly) {
        console.error('[ESTADISTICAS] Error RPC monthly stats:', errMonthly);
        throw errMonthly;
      }

      const meses = monthlyStats.map(stat => ({
        mes: stat.mes,
        visitas: Number(stat.visitas),
        ingresos: Number(stat.ingresos),
      }));

      // 5. Rendimiento por nutriólogo con RPC (una sola llamada)
      console.log('[ESTADISTICAS] Llamando RPC get_nutriologos_rendimiento...');
      const { data: rendimientoData, error: errRend } = await supabase
        .rpc('get_nutriologos_rendimiento');

      if (errRend) {
        console.error('[ESTADISTICAS] Error RPC rendimiento:', errRend);
        throw errRend;
      }

      // Actualizar estados
      setStats({ totalPacientes, totalNutriologos, citasMes, ingresosMes });
      setVisitasPorMes(meses.map(m => ({ mes: m.mes, visitas: m.visitas })));
      setIngresosPorMes(meses.map(m => ({ mes: m.mes, ingresos: m.ingresos })));
      setRendimientoNutriologos(rendimientoData || []);

      console.log('[ESTADISTICAS] Carga completada exitosamente con RPCs');
    } catch (err: any) {
      console.error('[ESTADISTICAS] Error general:', err);
      setErrorMsg(err.message || 'Error desconocido al cargar estadísticas');
      toast.error('No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-screen">
        <div className="text-[#2E8B57] font-bold text-xl animate-pulse">Cargando estadísticas...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-10 text-center text-red-600 min-h-screen">
        Error: {errorMsg}
        <br />
        <button 
          onClick={fetchStatistics}
          className="mt-4 px-4 py-2 bg-[#2E8B57] text-white rounded hover:bg-[#256e45]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header con gradiente sutil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Panel de Control</h1>
          <p className="text-muted-foreground mt-1 text-lg">Análisis de rendimiento y métricas del consultorio.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-sm">
            {new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Tarjetas de Resumen con Hover Effects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Pacientes Totales', value: stats.totalPacientes, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Usuarios registrados' },
          { title: 'Nutriólogos', value: stats.totalNutriologos, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Equipo activo' },
          { title: 'Citas del Mes', value: stats.citasMes, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', desc: '+ variación vs anterior' },
          { title: 'Ingresos Mensuales', value: `$${stats.ingresosMes.toLocaleString('es-MX')}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Facturación bruta' },
        ].map((item, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-none shadow-sm outline outline-1 outline-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{item.title}</CardTitle>
              <div className={`p-2 rounded-md ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                {item.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sección de Gráficas de Tendencia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm border-none ring-1 ring-gray-200">
          <CardHeader>
            <CardTitle>Flujo de Pacientes</CardTitle>
            <CardDescription>Volumen de visitas en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitasPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="visitas" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none ring-1 ring-gray-200">
          <CardHeader>
            <CardTitle>Distribución de Ingresos</CardTitle>
            <CardDescription>Ingresos mensuales por consultorio (MXN)</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ingresosPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Listado de Rendimiento */}
      <Card className="shadow-sm border-none ring-1 ring-gray-200 overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rendimiento por Especialista</CardTitle>
              <CardDescription>Métricas individuales de productividad y captación.</CardDescription>
            </div>
            <button className="text-sm font-medium text-blue-600 hover:underline">Exportar reporte</button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {rendimientoNutriologos.map((nutriologo) => (
              <div key={nutriologo.id_nutriologo} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
                      {nutriologo.nombre[0]}{nutriologo.apellido[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{nutriologo.nombre} {nutriologo.apellido}</h4>
                      <p className="text-sm text-muted-foreground">Nutrición Clínica</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-8 md:w-1/2">
                  <div className="text-center md:text-left">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Pacientes</p>
                    <p className="text-xl font-bold text-emerald-600">{nutriologo.pacientes}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Citas</p>
                    <p className="text-xl font-bold text-blue-600">
                      {nutriologo.citas}
                    </p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Ingresos</p>
                    <p className="text-xl font-bold text-amber-600">${nutriologo.ingresos.toLocaleString('es-MX')}</p>
                  </div>
                </div>
              </div>
            ))}

            {rendimientoNutriologos.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                No hay nutriólogos registrados aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}