/**
 * Authentic Tableau Desktop Sample Datasets Generator
 * Generates client-side CSV files for zero-latency instant exploration in DuckDB-WASM.
 */

export function createSuperstoreSampleFile(): File {
  const regions = ['Norte', 'Sur', 'Centro', 'Occidente'];
  const segments = ['Consumo', 'Corporativo', 'Pequeña Empresa'];
  const categories: Record<string, string[]> = {
    'Tecnología': ['Teléfonos', 'Accesorios', 'Copiadoras', 'Máquinas'],
    'Mobiliario': ['Sillas', 'Mesas', 'Libreros', 'Muebles de Oficina'],
    'Material de Oficina': ['Papel', 'Carpetas', 'Sobres', 'Arte', 'Etiquetas'],
  };
  const customers = [
    'Alejandro Silva', 'Beatriz Morales', 'Carlos Mendoza', 'Diana Navarro',
    'Eduardo Castro', 'Fernanda Ruiz', 'Gabriel Ortiz', 'Helena Vargas',
    'Ignacio Ramos', 'Jimena Peña', 'Kevin Soto', 'Laura Méndez',
    'Manuel Delgado', 'Natalia Flores', 'Óscar Romero', 'Patricia Guzmán',
  ];
  const statesByRegion: Record<string, string[]> = {
    'Norte': ['Nuevo León', 'Chihuahua', 'Coahuila', 'Sonora'],
    'Sur': ['Chiapas', 'Oaxaca', 'Guerrero', 'Veracruz'],
    'Centro': ['Ciudad de México', 'Estado de México', 'Puebla', 'Morelos'],
    'Occidente': ['Jalisco', 'Michoacán', 'Guanajuato', 'Sinaloa'],
  };

  const header = 'id_pedido,fecha_pedido,cliente,segmento,region,estado,categoria,subcategoria,ventas,cantidad,descuento,beneficio\n';
  const rows: string[] = [];

  // Deterministic PRNG for consistent samples
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const startDate = new Date('2024-01-01').getTime();
  const endDate = new Date('2026-09-30').getTime();

  for (let i = 1; i <= 600; i++) {
    const orderId = `MX-2026-${10000 + i}`;
    const orderTime = new Date(startDate + rand() * (endDate - startDate));
    const orderDate = orderTime.toISOString().split('T')[0];
    const customer = customers[Math.floor(rand() * customers.length)];
    const segment = segments[Math.floor(rand() * segments.length)];
    const region = regions[Math.floor(rand() * regions.length)];
    const stateList = statesByRegion[region];
    const state = stateList[Math.floor(rand() * stateList.length)];
    
    const catKeys = Object.keys(categories);
    const category = catKeys[Math.floor(rand() * catKeys.length)];
    const subList = categories[category];
    const subCategory = subList[Math.floor(rand() * subList.length)];

    const baseSales = category === 'Tecnología' ? 350 + rand() * 2200 : category === 'Mobiliario' ? 180 + rand() * 1200 : 25 + rand() * 350;
    const sales = Math.round(baseSales * 100) / 100;
    const quantity = Math.floor(rand() * 8) + 1;
    const discount = rand() > 0.6 ? (rand() > 0.5 ? 0.2 : 0.1) : 0;
    const profitMargin = 0.12 + rand() * 0.28 - (discount * 1.2);
    const profit = Math.round(sales * profitMargin * 100) / 100;

    rows.push(`${orderId},${orderDate},"${customer}",${segment},${region},${state},${category},${subCategory},${sales},${quantity},${discount},${profit}`);
  }

  const csvContent = header + rows.join('\n');
  return new File([csvContent], 'superstore_sample.csv', { type: 'text/csv' });
}

export function createWorldIndicatorsSampleFile(): File {
  const data = [
    { pais: 'México', region: 'América Latina', ano: 2025, pib_billones: 1.82, poblacion_millones: 130.2, inflacion: 4.5, esperanza_vida: 75.4, penetracion_internet: 78.6 },
    { pais: 'Brasil', region: 'América Latina', ano: 2025, pib_billones: 2.17, poblacion_millones: 216.4, inflacion: 3.9, esperanza_vida: 76.2, penetracion_internet: 81.0 },
    { pais: 'Chile', region: 'América Latina', ano: 2025, pib_billones: 0.34, poblacion_millones: 19.6, inflacion: 3.2, esperanza_vida: 80.5, penetracion_internet: 90.2 },
    { pais: 'Colombia', region: 'América Latina', ano: 2025, pib_billones: 0.38, poblacion_millones: 52.3, inflacion: 5.2, esperanza_vida: 77.1, penetracion_internet: 75.7 },
    { pais: 'Argentina', region: 'América Latina', ano: 2025, pib_billones: 0.62, poblacion_millones: 46.2, inflacion: 38.0, esperanza_vida: 77.3, penetracion_internet: 88.0 },
    { pais: 'Estados Unidos', region: 'América del Norte', ano: 2025, pib_billones: 28.78, poblacion_millones: 341.0, inflacion: 2.9, esperanza_vida: 79.1, penetracion_internet: 92.8 },
    { pais: 'Canadá', region: 'América del Norte', ano: 2025, pib_billones: 2.14, poblacion_millones: 40.1, inflacion: 2.6, esperanza_vida: 82.8, penetracion_internet: 94.0 },
    { pais: 'España', region: 'Europa', ano: 2025, pib_billones: 1.58, poblacion_millones: 48.1, inflacion: 2.8, esperanza_vida: 83.3, penetracion_internet: 94.5 },
    { pais: 'Alemania', region: 'Europa', ano: 2025, pib_billones: 4.45, poblacion_millones: 84.4, inflacion: 2.4, esperanza_vida: 81.6, penetracion_internet: 93.1 },
    { pais: 'Reino Unido', region: 'Europa', ano: 2025, pib_billones: 3.34, poblacion_millones: 68.2, inflacion: 2.5, esperanza_vida: 81.8, penetracion_internet: 96.0 },
    { pais: 'Francia', region: 'Europa', ano: 2025, pib_billones: 3.03, poblacion_millones: 68.0, inflacion: 2.3, esperanza_vida: 82.7, penetracion_internet: 92.0 },
    { pais: 'Japón', region: 'Asia-Pacífico', ano: 2025, pib_billones: 4.21, poblacion_millones: 124.0, inflacion: 2.2, esperanza_vida: 84.8, penetracion_internet: 93.5 },
    { pais: 'Corea del Sur', region: 'Asia-Pacífico', ano: 2025, pib_billones: 1.71, poblacion_millones: 51.7, inflacion: 2.4, esperanza_vida: 83.6, penetracion_internet: 97.2 },
    { pais: 'Australia', region: 'Asia-Pacífico', ano: 2025, pib_billones: 1.72, poblacion_millones: 26.8, inflacion: 3.4, esperanza_vida: 83.2, penetracion_internet: 96.2 },
  ];

  const header = 'pais,region,ano,pib_billones,poblacion_millones,inflacion,esperanza_vida,penetracion_internet\n';
  const rows = data.map(d => `${d.pais},${d.region},${d.ano},${d.pib_billones},${d.poblacion_millones},${d.inflacion},${d.esperanza_vida},${d.penetracion_internet}`);
  const csvContent = header + rows.join('\n');
  return new File([csvContent], 'indicadores_mundiales.csv', { type: 'text/csv' });
}
