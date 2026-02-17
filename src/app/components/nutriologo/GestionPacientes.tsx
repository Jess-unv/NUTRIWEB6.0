import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { Search, Award, TrendingUp, User, Activity, Users } from 'lucide-react';
import { toast } from 'sonner';

// Componente de carga animado
function AnimatedLoadingScreen() {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animación del icono (pacientes)
    const iconElement = iconRef.current;
    const textElement = textRef.current;
    const dotsElement = dotsRef.current;

    if (iconElement) {
      iconElement.animate(
        [
          { transform: 'rotate(0deg) scale(1)', opacity: 0.8 },
          { transform: 'rotate(360deg) scale(1.2)', opacity: 1 },
          { transform: 'rotate(720deg) scale(1)', opacity: 0.8 }
        ],
        {
          duration: 3000,
          iterations: Infinity,
          easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
        }
      );
    }

    if (textElement) {
      textElement.animate(
        [
          { opacity: 0.5 },
          { opacity: 1 },
          { opacity: 0.5 }
        ],
        {
          duration: 2000,
          iterations: Infinity,
          easing: 'ease-in-out'
        }
      );
    }

    if (dotsElement) {
      const dots = dotsElement.children;
      Array.from(dots).forEach((dot, index) => {
        (dot as HTMLElement).animate(
          [
            { transform: 'scale(0.8)', opacity: 0.5 },
            { transform: 'scale(1.2)', opacity: 1 },
            { transform: 'scale(0.8)', opacity: 0.5 }
          ],
          {
            duration: 1500,
            delay: index * 200,
            iterations: Infinity,
            easing: 'ease-in-out'
          }
        );
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0FFF4]">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <div 
            ref={iconRef}
            className="text-[#2E8B57]"
          >
            <Users size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando lista de pacientes...
        </div>
        
        <div 
          ref={dotsRef}
          className="flex justify-center gap-2"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-[#2E8B57]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GestionPacientes() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);

  useEffect(() => {
    if (!user?.nutriologoId) {
      setLoading(false);
      toast.error('No se detectó ID de nutriólogo');
      return;
    }

    console.log('[GestionPacientes] Nutriólogo ID (integer):', user.nutriologoId);
    console.log('[GestionPacientes] Auth UUID:', user.id);

    const fetchPacientes = async () => {
      setLoading(true);
      try {
        // 1. Obtener IDs de pacientes asignados (usa nutriologoId integer)
        const { data: relaciones, error: errRel } = await supabase
          .from('paciente_nutriologo')
          .select('id_paciente')
          .eq('id_nutriologo', Number(user.nutriologoId))
          .eq('activo', true);

        if (errRel) throw errRel;

        if (!relaciones?.length) {
          setPacientes([]);
          setLoading(false);
          return;
        }

        const pacienteIds = relaciones.map(r => r.id_paciente);

        // 2. Obtener datos completos de pacientes + puntos
        const { data: pacientesData, error: errPac } = await supabase
          .from('pacientes')
          .select(`
            id_paciente,
            nombre,
            apellido,
            correo,
            fecha_nacimiento,
            peso,
            altura,
            objetivo,
            puntos_paciente!inner (puntos_totales)
          `)
          .in('id_paciente', pacienteIds);

        if (errPac) throw errPac;

        // 3. Calcular edad y formatear
        const pacientesConEdad = pacientesData?.map(p => {
          const nacimiento = new Date(p.fecha_nacimiento);
          const hoy = new Date();
          const edad = hoy.getFullYear() - nacimiento.getFullYear();
          return {
            id: p.id_paciente,
            nombre: p.nombre,
            apellido: p.apellido,
            email: p.correo,
            edad,
            peso: p.peso || 0,
            altura: p.altura || 0,
            objetivo: p.objetivo || 'Sin objetivo definido',
            puntos: p.puntos_paciente?.puntos_totales || 0,
            // Simulamos calorías semanales (puedes conectar a registro_alimentos después)
            caloriasConsumidas: [1800, 1900, 1750, 2000, 1850, 2100, 1950],
            metaCalorias: 2000,
            fechaRegistro: new Date().toLocaleDateString('es-MX')
          };
        }) || [];

        setPacientes(pacientesConEdad);
      } catch (err: any) {
        console.error('Error cargando pacientes:', err);
        toast.error('No se pudieron cargar los pacientes');
      } finally {
        setLoading(false);
      }
    };

    fetchPacientes();
  }, [user?.nutriologoId]);

  const pacientesFiltrados = pacientes.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularIMC = (peso: number, altura: number) => {
    if (!altura || altura === 0) return 0;
    const imc = peso / Math.pow(altura / 100, 2);
    return imc.toFixed(1);
  };

  const categoriaIMC = (imc: number) => {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'bg-blue-100 text-blue-700' };
    if (imc < 25) return { label: 'Normal', color: 'bg-[#F0FFF4] text-[#2E8B57] border-[#D1E8D5]' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Obesidad', color: 'bg-red-100 text-red-700' };
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  return (
    <div className="min-h-screen p-6 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Encabezado estilo Perfil */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-4xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
                Mis Pacientes
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
            </div>
            <p className="text-[#3CB371] font-bold text-sm mt-4 uppercase tracking-[2px]">
              Gestiona la información de tus pacientes
            </p>
          </div>
        </div>

        {/* Buscador Estilizado */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E8B57]" />
          <Input
            placeholder="BUSCAR PACIENTE POR NOMBRE O EMAIL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 py-5 bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none text-[10px] font-black tracking-widest uppercase placeholder:text-gray-400 shadow-sm transition-all"
          />
        </div>

        {/* Tabla de pacientes */}
        <div className="bg-white rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-[#F0FFF4] flex items-center justify-between bg-[#F8FFF9]/50">
            <h3 className="text-sm font-[900] text-[#1A3026] uppercase tracking-[2px]">
              Pacientes Activos ({pacientesFiltrados.length})
            </h3>
            <Activity className="text-[#3CB371]" size={20} />
          </div>
          
          <div className="overflow-x-auto p-4">
            <Table>
              <TableHeader>
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Paciente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Edad</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Peso/Altura</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-wider">IMC</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Objetivo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Puntos</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-gray-500 tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientesFiltrados.map((paciente) => {
                  const imc = Number(calcularIMC(paciente.peso, paciente.altura));
                  const categoria = categoriaIMC(imc);
                  return (
                    <TableRow key={paciente.id} className="border-b border-[#F0FFF4] hover:bg-[#F8FFF9] transition-colors group">
                      <TableCell className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-[#F0FFF4] rounded-xl flex items-center justify-center border border-[#D1E8D5]">
                            <User size={18} className="text-[#2E8B57]" />
                          </div>
                          <div>
                            <p className="font-black text-[#1A3026] uppercase text-xs tracking-tight">
                              {paciente.nombre} {paciente.apellido}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400">{paciente.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-gray-600 text-xs">{paciente.edad} AÑOS</TableCell>
                      <TableCell className="font-bold text-gray-600 text-xs">{paciente.peso}KG / {paciente.altura}CM</TableCell>
                      <TableCell>
                        <Badge className={`${categoria.color} border-2 px-3 py-1 rounded-xl font-black text-[9px] uppercase tracking-tighter shadow-none`}>
                          {imc} - {categoria.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-[#2E8B57] text-[10px] uppercase max-w-[120px] truncate" title={paciente.objetivo}>
                        {paciente.objetivo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="bg-yellow-50 p-1.5 rounded-lg border border-yellow-100">
                            <Award className="h-3.5 w-3.5 text-yellow-500" />
                          </div>
                          <span className="font-black text-[#1A3026] text-sm">{paciente.puntos}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedPaciente(paciente)}
                              className="border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#F0FFF4] hover:border-[#2E8B57] transition-all px-4"
                            >
                              Ver Detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-8 overflow-hidden font-sans">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-[900] text-[#2E8B57] uppercase tracking-[2px] mb-4 text-left">
                                Perfil de {paciente.nombre} {paciente.apellido}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedPaciente && (
                              <div className="space-y-8 mt-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {[
                                    { label: 'EMAIL', val: paciente.email },
                                    { label: 'EDAD', val: `${paciente.edad} años` },
                                    { label: 'PESO ACTUAL', val: `${paciente.peso} kg` },
                                    { label: 'ALTURA', val: `${paciente.altura} cm` },
                                    { label: 'IMC', val: calcularIMC(paciente.peso, paciente.altura) },
                                    { label: 'OBJETIVO', val: paciente.objetivo },
                                    { label: 'PUNTOS', val: paciente.puntos, isAward: true },
                                    { label: 'REGISTRO', val: paciente.fechaRegistro },
                                  ].map((item, i) => (
                                    <div key={i} className="bg-[#F8FFF9] p-3 rounded-xl border border-[#D1E8D5] min-h-[80px] flex flex-col">
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                                      <p className="text-xs font-black text-[#1A3026] flex items-center gap-2 break-words">
                                        {item.isAward && <Award size={14} className="text-yellow-500 flex-shrink-0" />}
                                        <span className="break-all">{item.val}</span>
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-6 border-t-2 border-dashed border-[#F0FFF4]">
                                  <h4 className="text-xs font-black text-[#2E8B57] uppercase tracking-[3px] mb-6 flex items-center gap-2">
                                    <TrendingUp size={16} /> Progreso Semanal de Calorías
                                  </h4>
                                  <div className="grid grid-cols-7 gap-2">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia, idx) => {
                                      const calorias = paciente.caloriasConsumidas[idx];
                                      const porcentaje = (calorias / paciente.metaCalorias) * 100;
                                      return (
                                        <div key={dia} className="text-center">
                                          <div className="text-[9px] font-black text-gray-400 mb-2">{dia}</div>
                                          <div className="h-24 w-full bg-[#F0FFF4] rounded-xl flex items-end justify-center border border-[#D1E8D5] overflow-hidden">
                                            <div 
                                              className={`w-full transition-all duration-500 ${
                                                porcentaje >= 90 && porcentaje <= 110 ? 'bg-[#2E8B57]' : 
                                                porcentaje < 90 ? 'bg-blue-400' : 'bg-red-400'
                                              }`}
                                              style={{ height: `${Math.min(porcentaje, 100)}%` }}
                                            />
                                          </div>
                                          <div className="text-[9px] font-black text-[#1A3026] mt-2">{calorias}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pacientesFiltrados.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                      No se encontraron pacientes asignados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}