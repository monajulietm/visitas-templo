// Chilean regions with a representative subset of comunas.
// (Trimmed for brevity; the system loads dynamically — extend as needed.)

export const REGIONS_COMUNAS: Record<string, string[]> = {
  "Arica y Parinacota": ["Arica", "Camarones", "General Lagos", "Putre"],
  "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Pica", "Huara"],
  "Antofagasta": ["Antofagasta", "Calama", "Tocopilla", "Mejillones", "Taltal"],
  "Atacama": ["Copiapó", "Vallenar", "Caldera", "Chañaral", "Diego de Almagro"],
  "Coquimbo": ["La Serena", "Coquimbo", "Ovalle", "Illapel", "Vicuña"],
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "San Antonio", "Quillota", "La Ligua"],
  "Metropolitana": [
    "Santiago", "Providencia", "Las Condes", "Vitacura", "Ñuñoa", "La Reina",
    "Peñalolén", "Macul", "La Florida", "Puente Alto", "Maipú", "Pudahuel",
    "Quilicura", "Recoleta", "Independencia", "San Miguel", "San Joaquín",
    "Estación Central", "Lo Barnechea", "Huechuraba", "Conchalí", "Renca",
    "Cerro Navia", "Lo Prado", "Quinta Normal", "Pedro Aguirre Cerda",
    "Lo Espejo", "El Bosque", "La Cisterna", "San Ramón", "La Granja",
    "La Pintana", "San Bernardo", "Buin", "Paine", "Calera de Tango",
    "Colina", "Lampa", "Til Til", "Pirque", "San José de Maipo",
    "Talagante", "Peñaflor", "El Monte", "Isla de Maipo", "Padre Hurtado",
    "Melipilla", "Curacaví", "María Pinto", "Alhué", "San Pedro",
  ],
  "O'Higgins": ["Rancagua", "San Fernando", "Rengo", "Machalí", "Santa Cruz"],
  "Maule": ["Talca", "Curicó", "Linares", "Constitución", "Cauquenes"],
  "Ñuble": ["Chillán", "Chillán Viejo", "San Carlos", "Bulnes", "Quirihue"],
  "Biobío": ["Concepción", "Talcahuano", "Los Ángeles", "Chiguayante", "Coronel", "San Pedro de la Paz"],
  "La Araucanía": ["Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Angol"],
  "Los Ríos": ["Valdivia", "La Unión", "Río Bueno", "Panguipulli", "Lago Ranco"],
  "Los Lagos": ["Puerto Montt", "Osorno", "Castro", "Ancud", "Puerto Varas"],
  "Aysén": ["Coyhaique", "Aysén", "Chile Chico", "Cochrane"],
  "Magallanes": ["Punta Arenas", "Puerto Natales", "Porvenir", "Cabo de Hornos"],
  "Internacional": [],
};

export const REGIONS = Object.keys(REGIONS_COMUNAS);
