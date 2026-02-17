import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Users, Calendar, TrendingUp, DollarSign, Activity, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';

export function DashboardAdmin() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    citasMes: 0,
    ingresosMes: 0,
    actividadReciente: [],
  });

  const [citasPorDia, setCitasPorDia] = useState([]);
  const [ingresosPorSemana, setIngresosPorSemana] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fecha actual y mes
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // 1. Total pacientes activos
      const { count: totalPacientes, error: errPac } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      if (errPac) throw new Error(`Error pacientes: ${errPac.message}`);

      // 2. Citas este mes y hoy
      const { data: citas, error: errCitas } = await supabase
        .from('citas')
        .select('fecha_hora, estado')
        .gte('fecha_hora', `${monthStart}T00:00:00`)
        .lte('fecha_hora', `${monthEnd}T23:59:59`);

      if (errCitas) throw new Error(`Error citas: ${errCitas.message}`);

      const citasHoyCount = citas.filter(c => c.fecha_hora.startsWith(today)).length;
      const citasMesCount = citas.length;

      // 3. Ingresos mes (pagos completados)
      const { data: pagos, error: errPagos } = await supabase
        .from('pagos')
        .select('monto, fecha_pago')
        .eq('estado', 'completado')
        .gte('fecha_pago', monthStart)
        .lte('fecha_pago', monthEnd);

      if (errPagos) throw new Error(`Error pagos: ${errPagos.message}`);

      const ingresosMesTotal = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

      // 4. Actividad reciente (últimas 5 citas)
      const { data: actividad, error: errAct } = await supabase
        .from('citas')
        .select(`
          id_cita,
          fecha_hora,
          estado,
          id_paciente,
          pacientes (nombre, apellido)
        `)
        .in('estado', ['confirmada', 'completada'])
        .order('fecha_hora', { ascending: false })
        .limit(5);

      if (errAct) throw new Error(`Error actividad: ${errAct.message}`);

      // 5. Citas por día de la semana (mes actual)
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const citasPorDiaData = diasSemana.map((dia, idx) => ({
        dia,
        citas: citas.filter(c => new Date(c.fecha_hora).getDay() === idx).length,
      }));

      // 6. Ingresos por semana aproximado
      const semanas = [1, 2, 3, 4];
      const ingresosPorSemanaData = semanas.map(w => {
        const startDay = (w - 1) * 7 + 1;
        const endDay = w * 7;
        const start = `${monthStart.slice(0, 8)}${String(startDay).padStart(2, '0')}`;
        const end = `${monthStart.slice(0, 8)}${String(endDay).padStart(2, '0')}`;
        const ingresosSem = pagos
          .filter(p => p.fecha_pago >= start && p.fecha_pago <= end)
          .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
        return { semana: `Sem ${w}`, ingresos: ingresosSem };
      });

      setStats({
        totalPacientes: totalPacientes || 0,
        citasHoy: citasHoyCount,
        citasMes: citasMesCount,
        ingresosMes: ingresosMesTotal,
        actividadReciente: actividad || [],
      });

      setCitasPorDia(citasPorDiaData);
      setIngresosPorSemana(ingresosPorSemanaData);

    } catch (err: any) {
      console.error('Error cargando dashboard admin:', err);
      toast.error('Error al cargar estadísticas: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center">
        <div className="text-[#2E8B57] font-bold text-xl animate-pulse">
          Cargando dashboard administrativo...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Encabezado */}
        <div className="px-2">
          <h1 className="text-3xl md:text-4xl font-[900] text-[#1A3026] tracking-[4px] uppercase leading-none">
            Dashboard <span className="text-[#2E8B57]">Admin</span>
          </h1>
          <p className="text-[#3CB371] font-bold text-sm mt-4 uppercase tracking-[2px]">
            Vista general del consultorio NUTRI U
          </p>
        </div>

        {/* Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Pacientes" value={stats.totalPacientes} sub="Activos" icon={<Users size={20} />} color="bg-emerald-50 text-emerald-600" />
          <StatCard title="Citas Este Mes" value={stats.citasMes} sub={`+${stats.citasHoy} hoy`} icon={<Calendar size={20} />} color="bg-blue-50 text-blue-600" />
          <StatCard title="Ingresos Mensuales" value={`$${stats.ingresosMes.toLocaleString('es-MX')}`} sub="Mes actual" icon={<DollarSign size={20} />} color="bg-yellow-50 text-yellow-600" />
          <StatCard title="Tasa Asistencia" value="92%" sub="+5% vs anterior" icon={<TrendingUp size={20} />} color="bg-purple-50 text-purple-600" />
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#F0FFF4] p-8">
              <CardTitle className="text-xs font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <Activity size={18} className="text-[#2E8B57]" /> Volumen de Citas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={citasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0FFF4" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#F8FFF9' }} contentStyle={{ borderRadius: '15px', border: '2px solid #D1E8D5', fontWeight: 'bold' }} />
                  <Bar dataKey="citas" radius={[10, 10, 10, 10]} barSize={35}>
                    {citasPorDia.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2E8B57' : '#3CB371'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#F0FFF4] p-8">
              <CardTitle className="text-xs font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" /> Rendimiento Semanal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ingresosPorSemana}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0FFF4" />
                  <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '15px', border: '2px solid #D1E8D5', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="ingresos" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabla Actividad Reciente */}
        <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
          <CardHeader className="bg-[#F8FFF9] border-b border-[#F0FFF4] p-8 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-[900] text-[#1A3026] uppercase tracking-[2px]">
              Actividad Reciente
            </CardTitle>
            <ArrowUpRight className="text-[#3CB371]" size={20} />
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="space-y-4">
              {stats.actividadReciente.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No hay actividad reciente
                </div>
              ) : (
                stats.actividadReciente.map((cita) => (
                  <div 
                    key={cita.id_cita} 
                    className="flex items-center justify-between p-5 bg-[#F8FFF9] border-2 border-[#F0FFF4] rounded-3xl hover:border-[#D1E8D5] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center border-2 border-[#D1E8D5] group-hover:scale-110 transition-transform">
                        <Users className="h-5 w-5 text-[#2E8B57]" />
                      </div>
                      <div>
                        <p className="font-[900] text-[#1A3026] uppercase text-[11px] tracking-wide">
                          {cita.pacientes?.nombre} {cita.pacientes?.apellido}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                          {new Date(cita.fecha_hora).toLocaleDateString('es-MX')} • {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-4 py-1.5 text-[9px] font-[900] uppercase rounded-xl border-2 tracking-widest ${
                        cita.estado === 'completada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        cita.estado === 'confirmada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        cita.estado === 'pendiente' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {cita.estado}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// StatCard sin cambios
function StatCard({ title, value, sub, icon, color }) {
  return (
    <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
      <CardContent className="p-8">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${color} border-2 border-white shadow-sm`}>
            {icon}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-[900] text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-3xl font-[900] text-[#1A3026] tracking-tight">{value}</p>
          <p className="text-[10px] font-bold text-[#3CB371] mt-2 uppercase">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}