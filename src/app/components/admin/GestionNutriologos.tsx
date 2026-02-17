import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { UserPlus, Edit, Trash2, KeyRound, AlertTriangle, BadgeDollarSign, Mail, Phone, UserCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/context/supabaseClient';

interface Nutriologo {
  id_nutriologo: number;
  id_auth_user: string | null;
  nombre: string;
  apellido: string;
  correo: string;
  numero_celular?: string;
  tarifa_consulta: number;
  fecha_registro: string;
  activo: boolean;
}

export function GestionNutriologos() {
  const [nutriologos, setNutriologos] = useState<Nutriologo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    numero_celular: '',
    tarifa_consulta: '',
    password: '',           // Contraseña temporal (solo para creación)
  });

  useEffect(() => {
    fetchNutriologos();
  }, []);

  const fetchNutriologos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nutriologos')
        .select('*')
        .order('fecha_registro', { ascending: false });

      if (error) throw error;
      setNutriologos(data || []);
    } catch (err: any) {
      console.error('Error cargando nutriólogos:', err);
      toast.error('No se pudieron cargar los nutriólogos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'numero_celular') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [field]: numericValue }));
    } else if (field === 'tarifa_consulta') {
      const numericValue = value.replace(/[^\d.]/g, '');
      const parts = numericValue.split('.');
      if (parts.length <= 2) setFormData(prev => ({ ...prev, [field]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      correo: '',
      numero_celular: '',
      tarifa_consulta: '',
      password: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tarifa = parseFloat(formData.tarifa_consulta);
    if (isNaN(tarifa) || tarifa <= 0) {
      toast.error('La tarifa debe ser un número mayor a 0');
      return;
    }
    if (formData.numero_celular.length !== 10) {
      toast.error('El número celular debe tener 10 dígitos');
      return;
    }
    if (!formData.correo.includes('@')) {
      toast.error('Correo inválido');
      return;
    }

    // Validar contraseña solo en creación
    if (!editingId && (!formData.password || formData.password.length < 8)) {
      toast.error('La contraseña temporal debe tener al menos 8 caracteres');
      return;
    }

    const nutriologoData = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      correo: formData.correo.trim().toLowerCase(),
      numero_celular: formData.numero_celular,
      tarifa_consulta: tarifa,
      activo: true,
    };

    try {
      if (editingId) {
        // ── Editar ──
        const { error } = await supabase
          .from('nutriologos')
          .update(nutriologoData)
          .eq('id_nutriologo', editingId);

        if (error) throw error;
        toast.success('Nutriólogo actualizado exitosamente');
      } else {
        // ── Crear ──
        const passwordToUse = formData.password.trim();

        // Crear usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: nutriologoData.correo,
          password: passwordToUse,
          options: {
            emailRedirectTo: window.location.origin + '/login',
          },
        });

        if (authError) {
          // Manejar email ya registrado
          if (authError.message.includes('already registered') || authError.message.includes('duplicate key')) {
            toast.error(
              'Este correo ya está registrado en el sistema. ' +
              'Usa uno diferente o elimina el usuario existente desde el dashboard de Supabase (Authentication → Users).'
            );
          } else {
            throw authError;
          }
          return;
        }

        if (!authData.user) {
          throw new Error('No se pudo crear la cuenta de autenticación');
        }

        const userId = authData.user.id;

        // Insertar perfil en nutriologos
        const { error: insertError } = await supabase
          .from('nutriologos')
          .insert({
            id_auth_user: userId,
            nombre: nutriologoData.nombre,
            apellido: nutriologoData.apellido,
            correo: nutriologoData.correo,
            numero_celular: nutriologoData.numero_celular || null,
            tarifa_consulta: nutriologoData.tarifa_consulta,
            activo: true,
            cedula_profesional: '',           // Ajusta si es obligatorio
            especialidad: '',
            consultorio: '',
            horario_atencion: '',
            descripcion: '',
            experiencia_anios: 0,
            foto_perfil: 'nutriologo_default.png',
            calificacion_promedio: 0,
            total_citas: 0,
          });

        if (insertError) {
          // Rollback: eliminar usuario de Auth si falla el perfil
          await supabase.auth.admin.deleteUser(userId);
          throw insertError;
        }

        toast.success(
          `Nutriólogo creado exitosamente.\n` +
          `Contraseña temporal: ${passwordToUse}\n` +
          `(Compártela de forma segura con el nutriólogo para su primer inicio de sesión)`
        );
      }

      await fetchNutriologos();
      setIsDialogOpen(false);
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error guardando nutriólogo:', err);
      toast.error(err.message || 'Error al guardar el nutriólogo');
    }
  };

  const handleEdit = (nutriologo: Nutriologo) => {
    setEditingId(nutriologo.id_nutriologo);
    setFormData({
      nombre: nutriologo.nombre,
      apellido: nutriologo.apellido,
      correo: nutriologo.correo,
      numero_celular: nutriologo.numero_celular || '',
      tarifa_consulta: nutriologo.tarifa_consulta.toString(),
      password: '', // No editamos contraseña aquí
    });
    setIsEditDialogOpen(true);
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`¿Enviar email de recuperación de contraseña a ${email}?`)) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success(`Se envió un enlace de recuperación al correo ${email}`);
    } catch (err: any) {
      toast.error('Error al enviar recuperación: ' + err.message);
    }
  };

  const handleDelete = async (id: number, nombre: string, apellido: string, id_auth_user: string | null) => {
    if (!confirm(`¿Eliminar a ${nombre} ${apellido}?`)) return;

    try {
      const { error: deleteProfile } = await supabase
        .from('nutriologos')
        .delete()
        .eq('id_nutriologo', id);

      if (deleteProfile) throw deleteProfile;

      if (id_auth_user) {
        const { error: deleteAuth } = await supabase.auth.admin.deleteUser(id_auth_user);
        if (deleteAuth) console.warn('No se pudo eliminar usuario Auth:', deleteAuth);
      }

      toast.success(`Nutriólogo ${nombre} ${apellido} eliminado exitosamente`);
      await fetchNutriologos();
    } catch (err: any) {
      console.error('Error eliminando nutriólogo:', err);
      toast.error(err.message || 'No se pudo eliminar');
    }
  };

  return (
    <div className="p-4 md:p-10 bg-[#F8FFF9] min-h-screen space-y-10 font-sans">
      
      {/* Header Estilizado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <div className="inline-flex flex-col items-start">
            <h1 className="text-3xl md:text-4xl font-[900] text-[#1A3026] tracking-[4px] uppercase leading-none">
              Gestión de <span className="text-[#2E8B57]">Nutriólogos</span>
            </h1>
            <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-3" />
          </div>
          <p className="text-[#3CB371] font-bold text-sm mt-4 uppercase tracking-[2px]">
            Panel de administración de profesionales
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2E8B57] hover:bg-[#256e45] text-white font-[900] uppercase tracking-widest text-[11px] h-14 px-8 rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-3">
              <UserPlus className="h-4 w-4" />
              Registrar Nutriólogo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-[#D1E8D5] p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-[900] text-[#1A3026] uppercase tracking-tight">Nuevo Profesional</DialogTitle>
              <DialogDescription className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">
                Ingresa los datos y una contraseña temporal (se le compartirá al nutriólogo)
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Nombre</Label>
                <Input value={formData.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} placeholder="Ej: Juan" className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Apellido</Label>
                <Input value={formData.apellido} onChange={(e) => handleInputChange('apellido', e.target.value)} placeholder="Ej: Pérez" className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Correo</Label>
                <Input type="email" value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Celular (10 dígitos)</Label>
                <Input value={formData.numero_celular} onChange={(e) => handleInputChange('numero_celular', e.target.value)} maxLength={10} className="rounded-xl border-2 border-[#F0FFF4] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Tarifa ($)</Label>
                <Input value={formData.tarifa_consulta} onChange={(e) => handleInputChange('tarifa_consulta', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Contraseña Temporal</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const randomPass = generateRandomPassword();
                      setFormData(prev => ({ ...prev, password: randomPass }));
                      toast.info(`Contraseña generada: ${randomPass} (cópiala antes de guardar)`);
                    }}
                  >
                    <RefreshCw size={14} className="mr-1" /> Generar
                  </Button>
                </div>
                <Input 
                  type="text" 
                  value={formData.password} 
                  onChange={(e) => handleInputChange('password', e.target.value)} 
                  placeholder="Mínimo 8 caracteres" 
                  className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" 
                  required 
                  minLength={8}
                />
              </div>

              <DialogFooter className="md:col-span-2 pt-6">
                <Button type="submit" className="w-full bg-[#2E8B57] hover:bg-[#256e45] h-14 rounded-2xl font-[900] uppercase tracking-widest text-[11px]">
                  Confirmar Registro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla Principal */}
      <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
        <CardHeader className="bg-[#F8FFF9] border-b border-[#F0FFF4] p-8 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-[900] text-[#1A3026] uppercase tracking-[2px]">Nutriólogos Registrados</CardTitle>
            <p className="text-[10px] font-bold text-[#3CB371] uppercase mt-1 tracking-wider">Total: {nutriologos.length} Profesionales</p>
          </div>
          <UserCircle className="text-[#3CB371] opacity-20" size={40} />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Cargando nutriólogos...</div>
          ) : (
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-b border-[#F0FFF4] hover:bg-transparent">
                  <TableHead className="py-6 px-8 text-[10px] font-[900] uppercase text-gray-400 tracking-widest">Profesional</TableHead>
                  <TableHead className="text-[10px] font-[900] uppercase text-gray-400 tracking-widest">Contacto</TableHead>
                  <TableHead className="text-[10px] font-[900] uppercase text-gray-400 tracking-widest text-center">Tarifa</TableHead>
                  <TableHead className="text-right py-6 px-8 text-[10px] font-[900] uppercase text-gray-400 tracking-widest">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nutriologos.map((nutriologo) => (
                  <TableRow key={nutriologo.id_nutriologo} className="border-b border-[#F8FFF9] hover:bg-[#F8FFF9]/50 transition-colors group">
                    <TableCell className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-[#F8FFF9] border-2 border-[#D1E8D5] rounded-2xl flex items-center justify-center font-[900] text-[#2E8B57] text-sm group-hover:bg-[#2E8B57] group-hover:text-white transition-all duration-300">
                          {nutriologo.nombre[0]}{nutriologo.apellido[0]}
                        </div>
                        <div>
                          <p className="font-[900] text-[#1A3026] uppercase text-[12px] tracking-tight">{nutriologo.nombre} {nutriologo.apellido}</p>
                          <p className="font-mono text-[10px] text-gray-400 font-bold">
                            ID: {nutriologo.id_auth_user ? nutriologo.id_auth_user.slice(0,8)+'...' : 'Sin cuenta'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase">
                          <Mail size={12} className="text-[#3CB371]" /> {nutriologo.correo}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase">
                          <Phone size={12} className="text-[#3CB371]" /> {nutriologo.numero_celular || 'No registrado'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[#2E8B57] font-[900] text-[12px]">
                        <BadgeDollarSign size={14} /> ${nutriologo.tarifa_consulta.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-6 px-8">
                      <div className="flex justify-end gap-3">
                        {/* Botón Editar */}
                        <Dialog open={isEditDialogOpen && editingId === nutriologo.id_nutriologo} onOpenChange={(open) => {
                          setIsEditDialogOpen(open);
                          if (!open) { resetForm(); setEditingId(null); }
                        }}>
                          <DialogTrigger asChild>
                            <Button onClick={() => handleEdit(nutriologo)} variant="ghost" className="h-10 w-10 p-0 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                              <Edit size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl rounded-[2.5rem] border-2 border-[#D1E8D5] p-8">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-[900] text-[#1A3026] uppercase tracking-tight">Editar Nutriólogo</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Nombre</Label>
                                <Input value={formData.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Apellido</Label>
                                <Input value={formData.apellido} onChange={(e) => handleInputChange('apellido', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Correo</Label>
                                <Input type="email" value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Celular</Label>
                                <Input value={formData.numero_celular} onChange={(e) => handleInputChange('numero_celular', e.target.value)} maxLength={10} className="rounded-xl border-2 border-[#F0FFF4] h-12 bg-[#F8FFF9] font-bold" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Tarifa ($)</Label>
                                <Input value={formData.tarifa_consulta} onChange={(e) => handleInputChange('tarifa_consulta', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] h-12 bg-[#F8FFF9] font-bold" />
                              </div>

                              {/* Botón de reset contraseña en edición */}
                              <div className="md:col-span-2 flex justify-end">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleResetPassword(formData.correo)}
                                >
                                  <KeyRound size={16} className="mr-2" />
                                  Resetear Contraseña
                                </Button>
                              </div>

                              <DialogFooter className="md:col-span-2 pt-6">
                                <Button type="submit" className="w-full bg-[#2E8B57] hover:bg-[#256e45] h-14 rounded-2xl font-[900] uppercase tracking-widest text-[11px]">
                                  Guardar Cambios
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        {/* Botón Eliminar */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="h-10 w-10 p-0 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2.5rem] border-2 border-red-100 p-8">
                            <AlertDialogHeader>
                              <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-red-50 rounded-2xl text-red-600"><AlertTriangle size={24}/></div>
                                <AlertDialogTitle className="font-[900] uppercase tracking-tight text-red-600">Eliminar Nutriólogo</AlertDialogTitle>
                              </div>
                              <AlertDialogDescription className="font-bold text-gray-500 uppercase text-[10px] tracking-widest leading-relaxed">
                                ¿Estás seguro de eliminar a <span className="text-[#1A3026] text-[12px]">{nutriologo.nombre} {nutriologo.apellido}</span>? <br/>
                                Esta acción es irreversible y también se eliminará su cuenta de acceso.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8 gap-4">
                              <AlertDialogCancel className="h-12 rounded-xl border-2 font-[900] uppercase text-[10px] tracking-widest">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(nutriologo.id_nutriologo, nutriologo.nombre, nutriologo.apellido, nutriologo.id_auth_user)}
                                className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-[900] uppercase text-[10px] tracking-widest"
                              >
                                Eliminar Profesional
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}