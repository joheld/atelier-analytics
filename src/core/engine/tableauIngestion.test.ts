import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseTableauXml, parseTableauPackage } from './tableauIngestion';

describe('Tableau Workbook & Data Source Ingestion Pipeline (.twbx, .tdsx, .twb, .tds)', () => {
  it('parses Tableau XML (.twb/.tds) extracting calculated fields, captions and worksheets', () => {
    const sampleTableauXml = `<?xml version='1.0' encoding='utf-8' ?>
<workbook source-build='2024.1.0' version='18.1'>
  <datasources>
    <datasource caption='Superstore' name='federated.123'>
      <connection class='federated'>
      </connection>
      <column caption='Margen Porcentual' datatype='real' name='[Calculation_112233]' role='measure'>
        <calculation class='tableau' formula='SUM([Profit]) / SUM([Sales])' />
      </column>
      <column caption='Es Gran Cliente' datatype='boolean' name='[Calculation_445566]' role='dimension'>
        <calculation class='tableau' formula='[Sales] &gt; 1000' />
      </column>
      <column caption='ID de Orden' datatype='string' name='[Order_ID]' role='dimension' />
      <column caption='Fecha de Envio' datatype='date' name='[Ship_Date]' role='dimension' />
    </datasource>
  </datasources>
  <worksheets>
    <worksheet name='Analisis de Rentabilidad'>
      <table>
        <rows>[Calculation_112233]</rows>
        <cols>[Order_ID]</cols>
      </table>
    </worksheet>
  </worksheets>
</workbook>`;

    const metadata = parseTableauXml(sampleTableauXml);

    expect(metadata.calculatedFields).toHaveLength(2);

    const marginCalc = metadata.calculatedFields.find((c) => c.name === 'Margen Porcentual');
    expect(marginCalc).toBeDefined();
    expect(marginCalc?.formula).toBe('SUM([Profit]) / SUM([Sales])');
    expect(marginCalc?.role).toBe('measure');
    expect(marginCalc?.dataType).toBe('number');

    const bigCustomerCalc = metadata.calculatedFields.find((c) => c.name === 'Es Gran Cliente');
    expect(bigCustomerCalc).toBeDefined();
    expect(bigCustomerCalc?.formula).toBe('[Sales] > 1000');
    expect(bigCustomerCalc?.role).toBe('dimension');
    expect(bigCustomerCalc?.dataType).toBe('boolean');

    expect(metadata.columnCaptions['Order_ID']).toBe('ID de Orden');
    expect(metadata.columnCaptions['Ship_Date']).toBe('Fecha de Envio');

    expect(metadata.worksheets).toHaveLength(1);
    expect(metadata.worksheets[0].name).toBe('Analisis de Rentabilidad');
    expect(metadata.worksheets[0].rows).toContain('Calculation_112233');
    expect(metadata.worksheets[0].columns).toContain('Order_ID');
  });

  it('unpacks a Tableau Packaged Workbook (.twbx) and extracts embedded CSV data and metadata', async () => {
    const zip = new JSZip();

    // 1. Add embedded CSV data
    const csvData = `Customer_ID,Customer_Name,Sales,Profit
C-001,Carlos Mendoza,1500.50,320.00
C-002,Elena Gomez,890.00,120.50
C-003,Lucas Silva,2400.00,650.00`;
    zip.file('Data/Orders.csv', csvData);

    // 2. Add embedded .twb XML
    const twbXml = `<?xml version='1.0' encoding='utf-8' ?>
<workbook version='18.1'>
  <datasources>
    <datasource caption='Orders' name='orders_ds'>
      <column caption='Ratio de Ganancia' datatype='real' name='[Profit_Ratio]' role='measure'>
        <calculation class='tableau' formula='[Profit] / [Sales]' />
      </column>
    </datasource>
  </datasources>
</workbook>`;
    zip.file('Orders_Workbook.twb', twbXml);

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    const result = await parseTableauPackage(zipBuffer, 'superstore', 'superstore.twbx');

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].tableName).toBe('superstore');
    expect(result.tables[0].displayName).toContain('Orders.csv');
    expect(result.tables[0].csv).toContain('Carlos Mendoza');
    expect(result.tables[0].csv).toContain('1500.50');

    expect(result.metadata.calculatedFields).toHaveLength(1);
    expect(result.metadata.calculatedFields[0].name).toBe('Ratio de Ganancia');
    expect(result.metadata.calculatedFields[0].formula).toBe('[Profit] / [Sales]');
  });
});
