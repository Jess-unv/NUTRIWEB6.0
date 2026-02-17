import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Progress } from '@/app/components/ui/progress';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { Award, TrendingUp, Plus, Trophy, Star, Target, Crown } from 'lucide-react';
import { toast } from 'sonner';

// Componente de carga animado
function AnimatedLoadingScreen() {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animación del icono (trofeo verde)
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
            <Trophy size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando gamificaciones...
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

export function Gamificacion() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [puntosAsignar, setPuntosAsignar] = useState('');
  const [misPacientes, setMisPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]); // Lista filtrada por búsqueda
  const [searchQuery, setSearchQuery] = useState(''); // Texto de búsqueda
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.nutriologoId) {
      fetchMisPacientes();
    }
  }, [user]);

  const fetchMisPacientes = async () => {
    setLoading(true);
    try {
      const { data: relaciones, error: errRel } = await supabase
        .from('paciente_nutriologo')
        .select('id_paciente')
        .eq('id_nutriologo', user.nutriologoId)
        .eq('activo', true);

      if (errRel) throw errRel;

      const pacienteIds = relaciones.map(r => r.id_paciente);

      if (pacienteIds.length === 0) {
        setMisPacientes([]);
        setFilteredPacientes([]);
        return;
      }

      const { data: pacientes, error: errPac } = await supabase
        .from('pacientes')
        .select('id_paciente, nombre, apellido, correo') // Agregamos correo para búsqueda
        .in('id_paciente', pacienteIds);

      if (errPac) throw errPac;

      const { data: puntos, error: errPuntos } = await supabase
        .from('puntos_paciente')
        .select('id_paciente, puntos_totales')
        .in('id_paciente', pacienteIds);

      if (errPuntos) throw errPuntos;

      const pacientesConPuntos = pacientes.map(p => ({
        id: p.id_paciente,
        nombre: p.nombre,
        apellido: p.apellido,
        correo: p.correo,
        puntos: puntos.find(pt => pt.id_paciente === p.id_paciente)?.puntos_totales || 0,
      }));

      setMisPacientes(pacientesConPuntos);
      setFilteredPacientes(pacientesConPuntos); // Inicialmente todos

    } catch (error) {
      console.error('[Gamificacion] Error cargando pacientes:', error.message);
      toast.error('No se pudieron cargar los pacientes');
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar pacientes según la búsqueda
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase().trim();
    setSearchQuery(query);

    if (!query) {
      setFilteredPacientes(misPacientes);
      return;
    }

    const filtered = misPacientes.filter(paciente =>
      paciente.nombre.toLowerCase().includes(query) ||
      paciente.apellido.toLowerCase().includes(query) ||
      paciente.correo.toLowerCase().includes(query)
    );

    setFilteredPacientes(filtered);
  };

  // Nueva función para manejar Enter en búsqueda
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPacientes.length === 1) {
        const unicoPaciente = filteredPacientes[0];
        setSelectedPaciente(unicoPaciente.id.toString());
        toast.success(`Paciente seleccionado automáticamente: ${unicoPaciente.nombre} ${unicoPaciente.apellido}`);
      } else if (filteredPacientes.length > 1) {
        toast.info('Varios pacientes encontrados. Por favor selecciona uno del menú.');
      } else {
        toast.warning('No se encontró ningún paciente con esa búsqueda.');
      }
    }
  };

  const handleAsignarPuntos = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const puntosNum = parseInt(puntosAsignar);
      if (isNaN(puntosNum) || puntosNum <= 0) {
        toast.error('Ingresa una cantidad válida de puntos');
        return;
      }

      const pacienteId = parseInt(selectedPaciente);

      // Update puntos_paciente
      const { data: puntosData, error: errFetch } = await supabase
        .from('puntos_paciente')
        .select('puntos_totales')
        .eq('id_paciente', pacienteId)
        .single();

      if (errFetch) throw errFetch;

      const nuevosPuntos = (puntosData?.puntos_totales || 0) + puntosNum;

      const { error: errUpdate } = await supabase
        .from('puntos_paciente')
        .update({ puntos_totales: nuevosPuntos })
        .eq('id_paciente', pacienteId);

      if (errUpdate) throw errUpdate;

      // Log en log_puntos
      const { error: errLog } = await supabase
        .from('log_puntos')
        .insert({
          id_paciente: pacienteId,
          puntos: puntosNum,
          tipo_accion: 'cita',
          descripcion: 'Puntos asignados por nutriólogo',
        });

      if (errLog) throw errLog;

      toast.success(`${puntosNum} puntos asignados correctamente`);
      setIsDialogOpen(false);
      setSelectedPaciente('');
      setPuntosAsignar('');
      setSearchQuery('');
      fetchMisPacientes(); // Refresh lista

    } catch (error) {
      console.error('[Gamificacion] Error asignando puntos:', error.message);
      toast.error('No se pudieron asignar los puntos');
    }
  };

  const pacientesOrdenados = [...misPacientes].sort((a, b) => b.puntos - a.puntos);

  const getNivelPaciente = (puntos: number) => {
    if (puntos >= 300) return { nivel: 'Oro', color: 'text-yellow-600', border: 'border-yellow-200', bgColor: 'bg-yellow-50', icon: Crown };
    if (puntos >= 200) return { nivel: 'Plata', color: 'text-slate-500', border: 'border-slate-200', bgColor: 'bg-slate-50', icon: Award };
    if (puntos >= 100) return { nivel: 'Bronce', color: 'text-orange-600', border: 'border-orange-200', bgColor: 'bg-orange-50', icon: Star };
    return { nivel: 'Iniciante', color: 'text-emerald-600', border: 'border-emerald-200', bgColor: 'bg-emerald-50', icon: Target };
  };

  const getProgresoNivel = (puntos: number) => {
    if (puntos >= 300) return 100;
    if (puntos >= 200) return ((puntos - 200) / 100) * 100;
    if (puntos >= 100) return ((puntos - 100) / 100) * 100;
    return (puntos / 100) * 100;
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-3xl md:text-4xl font-[900] text-[#2E8B57] tracking-[4px] uppercase leading-none">
                Gamificación
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-3" />
            </div>
            <p className="text-[#3CB371] font-bold text-sm mt-4 uppercase tracking-[2px]">
              Motiva el progreso de tus pacientes
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-6 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" />
                Asignar Puntos
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-2 border-[#D1E8D5] p-8 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-[900] text-[#2E8B57] uppercase tracking-wider">
                  Premia el esfuerzo
                </DialogTitle>
                <DialogDescription>
                  Asigna puntos a tus pacientes para motivar su progreso y recompensar su constancia.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAsignarPuntos} className="space-y-6 mt-6">
                {/* Campo de búsqueda */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Buscar Paciente
                  </Label>
                  <Input
                    placeholder="Nombre, apellido o correo..."
                    value={searchQuery}
                    onChange={handleSearch}
                    onKeyDown={handleSearchKeyDown} // Agregado onKeyDown para Enter
                    className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold focus:ring-[#2E8B57]"
                  />
                </div>

                {/* Select con pacientes filtrados */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Paciente
                  </Label>
                  <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
                    <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
                      <SelectValue placeholder="Selecciona un paciente" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60 overflow-y-auto">
                      {filteredPacientes.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-xs">
                          No se encontraron pacientes
                        </div>
                      ) : (
                        filteredPacientes.map((paciente) => (
                          <SelectItem 
                            key={paciente.id} 
                            value={paciente.id.toString()} 
                            className="font-bold text-xs uppercase py-3"
                          >
                            {paciente.nombre} {paciente.apellido} ({paciente.correo}) - {paciente.puntos} pts
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cantidad de puntos */}
                <div className="space-y-2">
                  <Label htmlFor="puntos" className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Cantidad de Puntos
                  </Label>
                  <Input
                    id="puntos"
                    type="number"
                    min="1"
                    className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                    value={puntosAsignar}
                    onChange={(e) => setPuntosAsignar(e.target.value)}
                    required
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex-1 border-2 border-[#D1E8D5] text-gray-500 font-black uppercase rounded-xl h-14"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black uppercase text-[10px] tracking-widest h-14 rounded-xl"
                  >
                    Confirmar Recompensa
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resto del JSX igual que antes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: 'Iniciante', pts: '0-99', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Target },
            { n: 'Bronce', pts: '100-199', color: 'text-orange-600', bg: 'bg-orange-50', icon: Star },
            { n: 'Plata', pts: '200-299', color: 'text-slate-500', bg: 'bg-slate-50', icon: Award },
            { n: 'Oro', pts: '300+', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Crown },
          ].map((lvl) => (
            <Card key={lvl.n} className="rounded-[2rem] border-2 border-[#D1E8D5] overflow-hidden shadow-none">
              <CardContent className={`p-6 flex flex-col items-center justify-center text-center space-y-2 ${lvl.bg}`}>
                <lvl.icon className={lvl.color} size={24} />
                <p className={`font-black text-[10px] uppercase tracking-tighter ${lvl.color}`}>{lvl.n}</p>
                <p className="text-[10px] font-bold text-gray-400">{lvl.pts} PTS</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ranking */}
          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#D1E8D5] p-8">
              <CardTitle className="text-sm font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <Trophy className="text-[#2E8B57]" size={18} /> Hall de la Fama
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {pacientesOrdenados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay pacientes asignados aún
                </div>
              ) : (
                pacientesOrdenados.map((paciente, index) => {
                  const nivel = getNivelPaciente(paciente.puntos);
                  const progreso = getProgresoNivel(paciente.puntos);
                  return (
                    <div key={paciente.id} className="group relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 ${
                            index === 0 ? 'bg-yellow-400 border-yellow-500 text-white' : 'bg-white border-[#D1E8D5] text-[#2E8B57]'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-black text-[#1A3026] uppercase text-xs">
                              {paciente.nombre} {paciente.apellido}
                            </p>
                            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg border-2 ${nivel.border} ${nivel.bgColor}`}>
                              <nivel.icon size={10} className={nivel.color} />
                              <span className={`text-[8px] font-black uppercase ${nivel.color}`}>
                                {nivel.nivel}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#1A3026] leading-none">
                            {paciente.puntos}
                          </p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Puntos Totales
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-black uppercase text-gray-400 tracking-tighter">
                          <span>Progreso de Nivel</span>
                          <span>{progreso.toFixed(0)}%</span>
                        </div>
                        <Progress value={progreso} className="h-1.5 bg-[#F0FFF4]" />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Cumplimiento de Metas */}
          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#D1E8D5] p-8">
              <CardTitle className="text-sm font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <TrendingUp className="text-[#2E8B57]" size={18} /> Cumplimiento de Metas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {misPacientes.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No hay pacientes registrados aún
                </div>
              ) : (
                misPacientes.map((paciente) => {
                  const cumplimiento = (paciente.puntos / 300) * 100;  // Ejemplo basado en puntos (ajusta a tu lógica real)
                  const esExitoso = cumplimiento >= 90;
                  return (
                    <div key={paciente.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-[#1A3026] uppercase text-xs">{paciente.nombre}</p>
                          <p className="text-[10px] font-bold text-gray-400 tracking-tight">META: 300 PTS</p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border-2 font-black text-[10px] uppercase shadow-sm ${
                          esExitoso ? 'bg-[#F0FFF4] border-[#D1E8D5] text-[#2E8B57]' : 'bg-orange-50 border-orange-100 text-orange-600'
                        }`}>
                          {cumplimiento.toFixed(0)}% Performance
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(cumplimiento, 100)} 
                        className={`h-3 rounded-full ${esExitoso ? 'bg-[#F0FFF4]' : 'bg-orange-50'}`} 
                      />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}