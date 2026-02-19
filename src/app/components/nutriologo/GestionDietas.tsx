import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/app/components/ui/dialog';
import { supabase } from '@/app/context/supabaseClient';
import { useAuth } from '@/app/context/useAuth';
import { 
  FileText, 
  Download, 
  Plus, 
  Utensils, 
  Coffee, 
  Sun, 
  Moon, 
  Search, 
  Salad,
  Scale,
  Flame,
  Tag,
  Apple
} from 'lucide-react';
import { toast } from 'sonner';

// DATOS PROVISIONALES PARA COMIDAS (MOCK)
const MOCK_COMIDAS = [
  { 
    id_comida: 1, 
    nombre: 'Omelette de claras',
    descripcion: 'Omelette de 3 claras con espinacas y champiñones',
    categoria: 'Desayuno',
    porcion_sugerida: '3 claras + verduras',
    calorias_por_100g: 120,
    ingredientes: '3 claras de huevo, espinacas, champiñones, sal y pimienta',
    preparacion: 'Batir las claras, saltear las verduras y agregar las claras, cocinar hasta que esté firme'
  },
  { 
    id_comida: 2, 
    nombre: 'Avena con frutas',
    descripcion: 'Avena cocida con manzana y canela',
    categoria: 'Desayuno',
    porcion_sugerida: '1 taza',
    calorias_por_100g: 150,
    ingredientes: 'Avena, leche descremada, manzana, canela',
    preparacion: 'Cocer la avena con la leche, agregar manzana picada y canela'
  },
  { 
    id_comida: 3, 
    nombre: 'Manzana con almendras',
    descripcion: '1 manzana verde con 10 almendras',
    categoria: 'Colación',
    porcion_sugerida: '1 manzana + 10 almendras',
    calorias_por_100g: 95,
    ingredientes: 'Manzana verde, almendras',
    preparacion: 'Lavar la manzana y acompañar con las almendras'
  },
  { 
    id_comida: 4, 
    nombre: 'Yogurt con granola',
    descripcion: 'Yogurt griego natural con granola casera',
    categoria: 'Colación',
    porcion_sugerida: '1 yogurt + 2 cdas granola',
    calorias_por_100g: 130,
    ingredientes: 'Yogurt griego, granola, miel (opcional)',
    preparacion: 'Mezclar el yogurt con la granola'
  },
  { 
    id_comida: 5, 
    nombre: 'Pechuga de pollo',
    descripcion: 'Pechuga de pollo a la plancha con especias',
    categoria: 'Almuerzo',
    porcion_sugerida: '200g',
    calorias_por_100g: 165,
    ingredientes: 'Pechuga de pollo, ajo, romero, sal y pimienta',
    preparacion: 'Sazonar la pechuga y cocinar a la plancha 6-8 minutos por lado'
  },
  { 
    id_comida: 6, 
    nombre: 'Salmón al horno',
    descripcion: 'Filete de salmón al horno con hierbas',
    categoria: 'Cena',
    porcion_sugerida: '180g',
    calorias_por_100g: 208,
    ingredientes: 'Salmón, eneldo, limón, ajo, sal',
    preparacion: 'Hornear el salmón con las hierbas a 180°C por 15 minutos'
  },
  { 
    id_comida: 7, 
    nombre: 'Ensalada de quinoa',
    descripcion: 'Quinoa con vegetales y aderezo de limón',
    categoria: 'Almuerzo',
    porcion_sugerida: '1.5 tazas',
    calorias_por_100g: 140,
    ingredientes: 'Quinoa, pepino, tomate, cebolla morada, limón, aceite de oliva',
    preparacion: 'Cocer la quinoa, mezclar con vegetales picados y aliñar'
  },
  { 
    id_comida: 8, 
    nombre: 'Té verde',
    descripcion: 'Infusión de té verde',
    categoria: 'Bebida',
    porcion_sugerida: '1 taza',
    calorias_por_100g: 0,
    ingredientes: 'Agua, té verde',
    preparacion: 'Calentar agua y agregar el té, dejar reposar 3 minutos'
  },
  { 
    id_comida: 9, 
    nombre: 'Ensalada de atún',
    descripcion: 'Ensalada de atún con vegetales frescos',
    categoria: 'Almuerzo',
    porcion_sugerida: '1.5 tazas',
    calorias_por_100g: 180,
    ingredientes: 'Atún en agua, lechuga, tomate, cebolla, aceite de oliva, limón',
    preparacion: 'Mezclar el atún con los vegetales picados y aliñar'
  },
  { 
    id_comida: 10, 
    nombre: 'Batido de proteína',
    descripcion: 'Batido de proteína con leche de almendras y plátano',
    categoria: 'Colación',
    porcion_sugerida: '1 vaso',
    calorias_por_100g: 110,
    ingredientes: 'Proteína en polvo, leche de almendras, plátano, canela',
    preparacion: 'Licuar todos los ingredientes hasta obtener una mezcla homogénea'
  }
];

// Componente de carga animado
function AnimatedLoadingScreen() {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
            <Salad size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando planes de alimentación...
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

// Tipos
interface Comida {
  id_comida: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  porcion_sugerida: string;
  calorias_por_100g: number;
  ingredientes: string;
  preparacion: string;
}

export function GestionDietas() {
  const { user } = useAuth();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filteredPacientes, setFilteredPacientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dietas, setDietas] = useState<any[]>([]);
  const [comidas] = useState<Comida[]>(MOCK_COMIDAS); // Datos provisionales de comidas
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<string>('');
  const [selectedDia, setSelectedDia] = useState<number>(1);

  // Estado para las 5 comidas del día (solo IDs)
  const [dietaData, setDietaData] = useState({
    desayuno: { id_comida: '' },
    colacion1: { id_comida: '' },
    almuerzo: { id_comida: '' },
    colacion2: { id_comida: '' },
    cena: { id_comida: '' },
  });

  // Estado para mostrar detalles de las comidas seleccionadas
  const [comidasSeleccionadas, setComidasSeleccionadas] = useState<{[key: string]: Comida | null}>({
    desayuno: null,
    colacion1: null,
    almuerzo: null,
    colacion2: null,
    cena: null
  });

  // Nombres de días para mostrar
  const diasSemana = [
    '', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ];

  // Cargar pacientes y dietas desde Supabase (BD REAL)
  useEffect(() => {
    if (!user?.nutriologoId) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        // Pacientes desde BD REAL
        const { data: relData, error: relError } = await supabase
          .from('paciente_nutriologo')
          .select('id_paciente')
          .eq('id_nutriologo', user.nutriologoId)
          .eq('activo', true);

        if (relError) throw relError;

        if (relData?.length > 0) {
          const ids = relData.map(r => r.id_paciente);
          const { data: pacientesData } = await supabase
            .from('pacientes')
            .select('id_paciente, nombre, apellido, correo')
            .in('id_paciente', ids);

          setPacientes(pacientesData || []);
          setFilteredPacientes(pacientesData || []);
        }

        // Dietas desde BD REAL
        const { data: dietaData, error: dietaError } = await supabase
          .from('dietas')
          .select(`
            id_dieta,
            nombre_dieta,
            descripcion,
            fecha_inicio,
            id_paciente,
            dieta_detalle (*)
          `)
          .eq('id_nutriologo', user.nutriologoId)
          .eq('activa', true)
          .order('fecha_inicio', { ascending: false });

        if (dietaError) throw dietaError;

        const enriched = await Promise.all(
          (dietaData || []).map(async (dieta) => {
            const { data: paciente } = await supabase
              .from('pacientes')
              .select('nombre, apellido')
              .eq('id_paciente', dieta.id_paciente)
              .single();

            return {
              ...dieta,
              pacientes: paciente || { nombre: 'Desconocido', apellido: '' },
            };
          })
        );

        setDietas(enriched);
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.nutriologoId]);

  // Función para manejar la selección de una comida
  const handleComidaSelect = (mealKey: string, comidaId: string) => {
    const comidaSeleccionada = comidas.find(c => c.id_comida.toString() === comidaId) || null;
    
    setDietaData({
      ...dietaData,
      [mealKey]: { id_comida: comidaId }
    });

    setComidasSeleccionadas({
      ...comidasSeleccionadas,
      [mealKey]: comidaSeleccionada
    });
  };

  // Búsqueda de paciente
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase().trim();
    setSearchQuery(query);

    if (!query) {
      setFilteredPacientes(pacientes);
      return;
    }

    const filtered = pacientes.filter(p =>
      p.nombre.toLowerCase().includes(query) ||
      p.apellido.toLowerCase().includes(query) ||
      p.correo?.toLowerCase().includes(query)
    );

    setFilteredPacientes(filtered);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPacientes.length === 1) {
        const unico = filteredPacientes[0];
        setSelectedPaciente(unico.id_paciente.toString());
        toast.success(`Paciente seleccionado: ${unico.nombre} ${unico.apellido}`);
      } else if (filteredPacientes.length > 1) {
        toast.info('Varios pacientes encontrados. Selecciona uno.');
      } else {
        toast.warning('No se encontró ningún paciente.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPaciente) {
      toast.error('Selecciona un paciente');
      return;
    }

    // Verificar que al menos una comida esté seleccionada
    const tieneComidas = Object.values(dietaData).some(item => item.id_comida);
    if (!tieneComidas) {
      toast.error('Selecciona al menos una comida');
      return;
    }

    setLoading(true);

    try {
      // Crear dieta en BD REAL
      const { data: dieta, error: dietaError } = await supabase
        .from('dietas')
        .insert({
          id_nutriologo: user?.nutriologoId,
          id_paciente: parseInt(selectedPaciente),
          nombre_dieta: `Plan semanal - ${new Date().toLocaleDateString('es-MX')}`,
          fecha_inicio: new Date().toISOString().split('T')[0],
          activa: true,
        })
        .select('id_dieta')
        .single();

      if (dietaError) throw dietaError;

      // Eliminar detalles anteriores si existen
      await supabase
        .from('dieta_detalle')
        .delete()
        .eq('id_dieta', dieta.id_dieta)
        .eq('dia_semana', selectedDia);

      // Preparar detalles con las comidas seleccionadas
      const comidasDelDia = [
        { tipo: 'Desayuno', key: 'desayuno' },
        { tipo: 'Colación 1', key: 'colacion1' },
        { tipo: 'Almuerzo', key: 'almuerzo' },
        { tipo: 'Colación 2', key: 'colacion2' },
        { tipo: 'Cena', key: 'cena' },
      ];

      const detalles = comidasDelDia
        .filter(c => dietaData[c.key as keyof typeof dietaData].id_comida)
        .map((c, index) => {
          const comida = comidasSeleccionadas[c.key as keyof typeof comidasSeleccionadas];
          return {
            id_dieta: dieta.id_dieta,
            dia_semana: selectedDia,
            tipo_comida: c.tipo,
            descripcion: comida?.descripcion || '',
            categoria: comida?.categoria || null,
            porcion_sugerida: comida?.porcion_sugerida || null,
            calorias_por_100g: comida?.calorias_por_100g || null,
            orden: index,
          };
        });

      if (detalles.length > 0) {
        const { error: detalleError } = await supabase
          .from('dieta_detalle')
          .insert(detalles);

        if (detalleError) throw detalleError;
      }

      toast.success('¡Plan asignado correctamente!');
      setIsDialogOpen(false);
      
      // Resetear formulario
      setDietaData({
        desayuno: { id_comida: '' },
        colacion1: { id_comida: '' },
        almuerzo: { id_comida: '' },
        colacion2: { id_comida: '' },
        cena: { id_comida: '' },
      });
      setComidasSeleccionadas({
        desayuno: null,
        colacion1: null,
        almuerzo: null,
        colacion2: null,
        cena: null
      });
      setSelectedPaciente('');
      setSelectedDia(1);
      setSearchQuery('');

      // Refrescar dietas
      const refreshDietas = async () => {
        const { data: dietaData, error: dietaError } = await supabase
          .from('dietas')
          .select(`
            id_dieta,
            nombre_dieta,
            descripcion,
            fecha_inicio,
            id_paciente,
            dieta_detalle (*)
          `)
          .eq('id_nutriologo', user?.nutriologoId)
          .eq('activa', true)
          .order('fecha_inicio', { ascending: false });

        if (!dietaError && dietaData) {
          const enriched = await Promise.all(
            dietaData.map(async (dieta) => {
              const { data: paciente } = await supabase
                .from('pacientes')
                .select('nombre, apellido')
                .eq('id_paciente', dieta.id_paciente)
                .single();

              return {
                ...dieta,
                pacientes: paciente || { nombre: 'Desconocido', apellido: '' },
              };
            })
          );
          setDietas(enriched);
        }
      };
      refreshDietas();

    } catch (err: any) {
      console.error('Error al guardar plan:', err);
      toast.error('No se pudo guardar: ' + (err.message || 'Intenta nuevamente'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  // Función auxiliar para agrupar detalles por día
  const groupByDay = (detalles: any[]) => {
    const groups: { [key: number]: any[] } = {};
    detalles.forEach(d => {
      if (!groups[d.dia_semana]) groups[d.dia_semana] = [];
      groups[d.dia_semana].push(d);
    });
    return groups;
  };

  const comidasConfig = [
    { key: 'desayuno', label: 'Desayuno', icon: Coffee, color: 'text-amber-600' },
    { key: 'colacion1', label: 'Colación 1', icon: Apple, color: 'text-green-600' },
    { key: 'almuerzo', label: 'Almuerzo', icon: Sun, color: 'text-orange-600' },
    { key: 'colacion2', label: 'Colación 2', icon: Apple, color: 'text-green-600' },
    { key: 'cena', label: 'Cena', icon: Moon, color: 'text-indigo-600' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
              Gestión de Dietas
            </h1>
            <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-6 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                <Plus className="h-5 w-5" />
                Nueva Dieta
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-0 overflow-hidden">
              <div className="custom-dialog-scroll overflow-y-auto max-h-[90vh]">
                <div className="p-6 md:p-10">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-[900] text-[#2E8B57] uppercase tracking-[2px]">
                      Crear Plan Nutricional
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 mt-2">
                      Asigna un plan alimenticio personalizado seleccionando comidas de tu catálogo.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 mt-8">
                    {/* Buscador de Paciente - BD REAL */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Buscar Paciente</Label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E8B57]" />
                        <Input
                          placeholder="Escribe nombre, apellido o correo..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e);
                          }}
                          onKeyDown={handleSearchKeyDown}
                          className="pl-12 border-2 border-[#D1E8D5] rounded-xl h-12 font-bold focus:ring-[#2E8B57]"
                        />
                      </div>
                    </div>

                    {/* Paciente Seleccionado - BD REAL */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Paciente Seleccionado</Label>
                      <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
                        <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
                          <SelectValue placeholder="Selecciona o busca un paciente" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-60 overflow-y-auto custom-dialog-scroll">
                          {filteredPacientes.length === 0 && searchQuery ? (
                            <div className="p-4 text-center text-gray-500 text-xs">
                              No se encontraron pacientes
                            </div>
                          ) : (
                            filteredPacientes.map((p) => (
                              <SelectItem 
                                key={p.id_paciente} 
                                value={p.id_paciente.toString()} 
                                className="font-bold text-xs uppercase py-3"
                              >
                                {p.nombre} {p.apellido}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selección de Día */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Seleccionar Día</Label>
                      <Select value={selectedDia.toString()} onValueChange={(val) => setSelectedDia(parseInt(val))}>
                        <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
                          <SelectValue placeholder="Elige un día" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2 border-[#D1E8D5] custom-dialog-scroll">
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia, idx) => (
                            <SelectItem key={idx + 1} value={(idx + 1).toString()} className="font-bold text-xs uppercase">
                              {dia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Comidas del día - 5 tiempos (MOCK) */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-[900] text-[#2E8B57] uppercase tracking-wider border-b-2 border-[#D1E8D5] pb-2">
                        Selecciona las comidas del día
                      </h3>
                      
                      {comidasConfig.map((meal) => (
                        <div key={meal.key} className="space-y-4 p-5 border-2 border-[#D1E8D5] rounded-3xl bg-white shadow-sm">
                          <div className="flex items-center gap-2">
                            <meal.icon size={18} className={meal.color} />
                            <Label className="text-sm font-black uppercase text-[#1A3026]">{meal.label}</Label>
                          </div>

                          {/* Selector de comida desde MOCK */}
                          <div className="space-y-2">
                            <Select 
                              value={dietaData[meal.key as keyof typeof dietaData].id_comida}
                              onValueChange={(val) => handleComidaSelect(meal.key, val)}
                            >
                              <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
                                <SelectValue placeholder="Selecciona una comida del catálogo" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-2 border-[#D1E8D5] custom-dialog-scroll max-h-60">
                                {comidas.length === 0 ? (
                                  <div className="p-4 text-center text-gray-500 text-xs">
                                    No hay comidas en el catálogo.
                                  </div>
                                ) : (
                                  comidas.map((comida) => (
                                    <SelectItem 
                                      key={comida.id_comida} 
                                      value={comida.id_comida.toString()} 
                                      className="font-bold text-xs py-3"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-black">{comida.nombre}</span>
                                        <span className="text-[10px] text-gray-500">{comida.categoria} • {comida.porcion_sugerida}</span>
                                      </div>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Mostrar detalles de la comida seleccionada */}
                          {comidasSeleccionadas[meal.key as keyof typeof comidasSeleccionadas] && (
                            <div className="mt-3 p-4 bg-[#F8FFF9] rounded-xl border border-[#D1E8D5]">
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                {comidasSeleccionadas[meal.key as keyof typeof comidasSeleccionadas]?.descripcion}
                              </p>
                              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 uppercase font-bold text-center">
                                <p className="flex items-center justify-center gap-1">
                                  <Tag size={12} className="text-[#2E8B57]" /> 
                                  {comidasSeleccionadas[meal.key as keyof typeof comidasSeleccionadas]?.categoria}
                                </p>
                                <p className="flex items-center justify-center gap-1">
                                  <Scale size={12} className="text-[#2E8B57]" /> 
                                  {comidasSeleccionadas[meal.key as keyof typeof comidasSeleccionadas]?.porcion_sugerida}
                                </p>
                                <p className="flex items-center justify-center gap-1">
                                  <Flame size={12} className="text-[#2E8B57]" /> 
                                  {comidasSeleccionadas[meal.key as keyof typeof comidasSeleccionadas]?.calorias_por_100g} kcal
                                </p>
                              </div>
                              {comidasSeleccionadas[meal.key as keyof typeof comidasSeleccionadas]?.ingredientes && (
                                <div className="mt-2 pt-2 border-t border-[#D1E8D5]">
                                  <p className="text-[10px] text-gray-500">
                                    <span className="font-bold">Ingredientes:</span> {comidasSeleccionadas[meal.key as keyof typeof comidasSeleccionadas]?.ingredientes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setDietaData({
                            desayuno: { id_comida: '' },
                            colacion1: { id_comida: '' },
                            almuerzo: { id_comida: '' },
                            colacion2: { id_comida: '' },
                            cena: { id_comida: '' },
                          });
                          setComidasSeleccionadas({
                            desayuno: null,
                            colacion1: null,
                            almuerzo: null,
                            colacion2: null,
                            cena: null
                          });
                        }}
                        className="flex-1 border-2 border-[#D1E8D5] text-gray-400 font-black text-[10px] uppercase rounded-xl h-14"
                      >
                        Descartar
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black text-[10px] uppercase rounded-xl h-14"
                      >
                        {loading ? 'Guardando...' : 'Asignar Plan al Paciente'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              <style jsx global>{`
                .custom-dialog-scroll::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-dialog-scroll::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-dialog-scroll::-webkit-scrollbar-thumb {
                  background: #D1E8D5;
                  border-radius: 10px;
                }
                .custom-dialog-scroll::-webkit-scrollbar-thumb:hover {
                  background: #3CB371;
                }
              `}</style>
            </DialogContent>
          </Dialog>
        </div>

        {/* Listado de Dietas - BD REAL */}
        <div className="space-y-10">
          {dietas.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-[#D1E8D5] p-20 flex flex-col items-center justify-center text-center">
              <FileText className="h-10 w-10 text-[#D1E8D5] mb-4" />
              <h3 className="text-lg font-black text-[#1A3026] uppercase">No hay dietas activas</h3>
            </div>
          ) : (
            dietas.map((dieta) => {
              const detallesPorDia = groupByDay(dieta.dieta_detalle || []);

              return (
                <Card key={dieta.id_dieta} className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white overflow-hidden hover:border-[#2E8B57] transition-all">
                  <CardHeader className="p-6 md:p-8 bg-[#F8FFF9]/50 border-b border-[#F0FFF4]">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center border-2 border-[#D1E8D5]">
                          <Utensils className="text-[#2E8B57]" size={20} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-[900] text-[#1A3026] uppercase">
                            {dieta.pacientes.nombre} {dieta.pacientes.apellido}
                          </CardTitle>
                          <p className="text-[10px] font-black text-[#3CB371] uppercase">{dieta.nombre_dieta}</p>
                          <p className="text-[10px] text-gray-500">
                            Inicio: {new Date(dieta.fecha_inicio).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-[10px] uppercase rounded-xl px-6 h-10">
                        <Download className="h-4 w-4 mr-2" /> Exportar PDF
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 md:p-8">
                    <div className="space-y-8">
                      {Object.keys(detallesPorDia)
                        .sort((a, b) => Number(a) - Number(b))
                        .map((diaKey) => {
                          const diaNum = Number(diaKey);
                          const detallesDia = detallesPorDia[diaNum].sort((a, b) => a.orden - b.orden);

                          return (
                            <div key={diaNum} className="space-y-4">
                              <h3 className="text-lg font-[900] text-[#2E8B57] uppercase tracking-wide">
                                {diasSemana[diaNum]}
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                {detallesDia.map((detalle: any, idx: number) => (
                                  <div key={idx} className="p-5 rounded-2xl border-2 border-[#F0FFF4] bg-[#F8FFF9] shadow-sm hover:shadow-md transition-all">
                                    <p className="font-[900] text-sm text-[#1A3026] uppercase mb-3 flex items-center gap-1">
                                      {detalle.tipo_comida === 'Desayuno' && <Coffee size={14} className="text-amber-600" />}
                                      {detalle.tipo_comida === 'Colación 1' && <Apple size={14} className="text-green-600" />}
                                      {detalle.tipo_comida === 'Almuerzo' && <Sun size={14} className="text-orange-600" />}
                                      {detalle.tipo_comida === 'Colación 2' && <Apple size={14} className="text-green-600" />}
                                      {detalle.tipo_comida === 'Cena' && <Moon size={14} className="text-indigo-600" />}
                                      {detalle.tipo_comida}
                                    </p>
                                    <p className="text-sm font-medium text-gray-700 mb-3">
                                      "{detalle.descripcion}"
                                    </p>
                                    <div className="text-xs text-gray-500 space-y-1 uppercase font-bold">
                                      {detalle.categoria && (
                                        <p className="flex items-center gap-1">
                                          <Tag size={12} className="text-[#2E8B57]" /> {detalle.categoria}
                                        </p>
                                      )}
                                      {detalle.porcion_sugerida && (
                                        <p className="flex items-center gap-1">
                                          <Scale size={12} className="text-[#2E8B57]" /> {detalle.porcion_sugerida}
                                        </p>
                                      )}
                                      {detalle.calorias_por_100g && (
                                        <p className="flex items-center gap-1">
                                          <Flame size={12} className="text-[#2E8B57]" /> ~{detalle.calorias_por_100g} kcal/100g
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Función auxiliar para agrupar detalles por día
function groupByDay(detalles: any[]) {
  const groups: { [key: number]: any[] } = {};
  detalles.forEach(d => {
    if (!groups[d.dia_semana]) groups[d.dia_semana] = [];
    groups[d.dia_semana].push(d);
  });
  return groups;
}