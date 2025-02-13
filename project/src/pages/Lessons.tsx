import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  Upload, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Clock,
  Users,
  Trash2,
  Edit2,
  Download,
  Link,
  Tag,
  BookOpenCheck,
  FolderPlus,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Subject {
  id: string;
  name: string;
  description: string;
  objectives: string[];
}

interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  file_url?: string;
  link_url?: string;
  tags: string[];
}

export default function Lessons() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '', objectives: [''] });
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    subject: '',
    file: null as File | null,
    tags: ['']
  });

  useEffect(() => {
    fetchSubjects();
    fetchResources();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      console.error('Konular yüklenirken hata:', error);
      toast.error('Konular yüklenirken bir hata oluştu');
    }
  };

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Kaynaklar yüklenirken hata:', error);
      toast.error('Kaynaklar yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          name: newSubject.name,
          description: newSubject.description,
          objectives: newSubject.objectives.filter(obj => obj.trim() !== '')
        }])
        .select()
        .single();

      if (error) throw error;

      setSubjects([...subjects, data]);
      setShowSubjectModal(false);
      setNewSubject({ name: '', description: '', objectives: [''] });
      toast.success('Konu başarıyla eklendi');
    } catch (error: any) {
      console.error('Konu ekleme hatası:', error);
      toast.error('Konu eklenirken bir hata oluştu');
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let fileUrl = '';
      if (newResource.file) {
        const fileExt = newResource.file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, newResource.file);

        if (uploadError) throw uploadError;
        fileUrl = filePath;
      }

      const { data, error } = await supabase
        .from('lesson_resources')
        .insert([{
          title: newResource.title,
          description: newResource.description,
          subject: newResource.subject,
          file_url: fileUrl || null,
          tags: newResource.tags.filter(tag => tag.trim() !== '')
        }])
        .select()
        .single();

      if (error) throw error;

      setResources([data, ...resources]);
      setShowResourceModal(false);
      setNewResource({
        title: '',
        description: '',
        subject: '',
        file: null,
        tags: ['']
      });
      toast.success('Kaynak başarıyla eklendi');
    } catch (error: any) {
      console.error('Kaynak ekleme hatası:', error);
      toast.error('Kaynak eklenirken bir hata oluştu');
    }
  };

  const handleDownload = async (fileUrl: string, title: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .download(fileUrl);

      if (error) throw error;

      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title + '_' + fileUrl.split('/').pop();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Dosya indiriliyor...');
    } catch (error: any) {
      console.error('Dosya indirme hatası:', error);
      toast.error('Dosya indirilirken bir hata oluştu');
    }
  };

  const handleDeleteResource = async (resourceId: string, fileUrl?: string) => {
    if (!window.confirm('Bu kaynağı silmek istediğinizden emin misiniz?')) return;

    try {
      if (fileUrl) {
        const { error: storageError } = await supabase.storage
          .from('resources')
          .remove([fileUrl]);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase
        .from('lesson_resources')
        .delete()
        .eq('id', resourceId);

      if (dbError) throw dbError;

      setResources(prevResources => 
        prevResources.filter(resource => resource.id !== resourceId)
      );

      toast.success('Kaynak başarıyla silindi');
    } catch (error: any) {
      console.error('Silme işlemi hatası:', error);
      toast.error('Kaynak silinirken bir hata oluştu');
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Bu konuyu silmek istediğinizden emin misiniz? Bağlı tüm kaynaklar da silinecektir.')) return;

    try {
      const { data: relatedResources, error: fetchError } = await supabase
        .from('lesson_resources')
        .select('id, file_url')
        .eq('subject', subjectId);

      if (fetchError) throw fetchError;

      for (const resource of (relatedResources || [])) {
        if (resource.file_url) {
          const { error: storageError } = await supabase.storage
            .from('resources')
            .remove([resource.file_url]);

          if (storageError) throw storageError;
        }
      }

      if (relatedResources?.length) {
        const { error: resourcesError } = await supabase
          .from('lesson_resources')
          .delete()
          .eq('subject', subjectId);

        if (resourcesError) throw resourcesError;
      }

      const { error: subjectError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (subjectError) throw subjectError;

      setSubjects(prevSubjects => 
        prevSubjects.filter(subject => subject.id !== subjectId)
      );

      toast.success('Konu ve ilgili kaynaklar başarıyla silindi');
    } catch (error: any) {
      console.error('Silme işlemi hatası:', error);
      toast.error('Konu silinirken bir hata oluştu');
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSubject = !selectedSubject || resource.subject === selectedSubject;
    
    return matchesSearch && matchesSubject;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Araç Çubuğu */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Kaynak ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(e.target.value || null)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Tüm Konular</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSubjectModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
            >
              <FolderPlus className="h-5 w-5 mr-2" />
              Konu Ekle
            </button>
            <button
              onClick={() => setShowResourceModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <Upload className="h-5 w-5 mr-2" />
              Kaynak Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Konular ve Kaynaklar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map(resource => (
          <div
            key={resource.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {resource.title}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDeleteResource(resource.id, resource.file_url)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {resource.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {resource.description}
                </p>
              )}

              {resource.file_url && (
                <button
                  onClick={() => handleDownload(resource.file_url!, resource.title)}
                  className="w-full mt-4 flex items-center justify-center px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Dosyayı İndir
                </button>
              )}

              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {resource.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Kaynak Bulunamadı
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Arama kriterlerinize uygun kaynak bulunmamaktadır.
          </p>
        </div>
      )}

      {/* Konu Ekleme Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Yeni Konu Ekle
              </h3>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Konu Adı
                </label>
                <input
                  type="text"
                  required
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Açıklama
                </label>
                <textarea
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hedefler
                </label>
                {newSubject.objectives.map((objective, index) => (
                  <div key={index} className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => {
                        const newObjectives = [...newSubject.objectives];
                        newObjectives[index] = e.target.value;
                        setNewSubject({ ...newSubject, objectives: newObjectives });
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    {index === newSubject.objectives.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setNewSubject({
                          ...newSubject,
                          objectives: [...newSubject.objectives, '']
                        })}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kaynak Ekleme Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Yeni Kaynak Ekle
              </h3>
              <button
                onClick={() => setShowResourceModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Başlık
                </label>
                <input
                  type="text"
                  required
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Açıklama
                </label>
                <textarea
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Konu
                </label>
                <select
                  required
                  value={newResource.subject}
                  onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Konu Seçin</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dosya
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewResource({
                    ...newResource,
                    file: e.target.files ? e.target.files[0] : null
                  })}
                  className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100
                    dark:file:bg-indigo-900 dark:file:text-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Etiketler
                </label>
                {newResource.tags.map((tag, index) => (
                  <div key={index} className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => {
                        const newTags = [...newResource.tags];
                        newTags[index] = e.target.value;
                        setNewResource({ ...newResource, tags: newTags });
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    {index === newResource.tags.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setNewResource({
                          ...newResource,
                          tags: [...newResource.tags, '']
                        })}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}