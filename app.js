// DataForge - High-Performance In-Browser Data Formatter & Converter
(function () {
  'use strict';

  // DOM Elements
  const tabs = document.querySelectorAll('.tab-btn');
  const toolControls = document.getElementById('tool-controls');
  const inputArea = document.getElementById('input-area');
  const outputArea = document.getElementById('output-area');
  const inputTitle = document.getElementById('input-title');
  const outputTitle = document.getElementById('output-title');
  const inputStats = document.getElementById('input-stats');
  const outputStats = document.getElementById('output-stats');
  const btnSample = document.getElementById('btn-sample');
  const btnClear = document.getElementById('btn-clear');
  const btnCopy = document.getElementById('btn-copy');
  const btnDownload = document.getElementById('btn-download');
  const toast = document.getElementById('status-toast');

  let currentTool = 'json';

  // Sample Data Definitions
  const SAMPLES = {
    json: JSON.stringify({
      appName: "DataForge",
      version: "2.0.0",
      features: ["JSON Prettifier", "CSV Converter", "SQL Formatter"],
      settings: { clientSide: true, private: true, costUSD: 0 },
      users: [
        { id: 101, name: "Alice Developer", role: "Frontend" },
        { id: 102, name: "Bob Engineer", role: "Backend" }
      ]
    }),
    csv: "id,name,role,department,salary\n1,Alex Mercer,Fullstack Engineer,Core Tech,95000\n2,Sarah Connor,DevOps Specialist,Infrastructure,105000\n3,Bruce Wayne,Data Architect,Security,140000",
    sql: "select u.id, u.username, p.total_amount, p.created_at from users u inner join payments p on u.id = p.user_id where p.status = 'COMPLETED' and p.total_amount > 100 group by u.id, u.username order by p.created_at desc limit 50;"
  };

  // Toast Notification
  function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => {
      toast.className = 'toast hidden';
    }, 2500);
  }

  // Update Line & Character Statistics
  function updateStats() {
    const inVal = inputArea.value;
    const outVal = outputArea.value;

    const inLines = inVal ? inVal.split('\n').length : 0;
    const inChars = inVal.length;
    inputStats.textContent = `${inLines} lines | ${inChars} chars`;

    const outLines = outVal ? outVal.split('\n').length : 0;
    const outChars = outVal.length;
    outputStats.textContent = `${outLines} lines | ${outChars} chars`;
  }

  inputArea.addEventListener('input', updateStats);

  // ----------------------------------------------------
  // Tool 1: JSON Logic
  // ----------------------------------------------------
  function renderJsonControls() {
    toolControls.innerHTML = `
      <select class="select-control" id="json-indent">
        <option value="2">2 Spaces Indent</option>
        <option value="4">4 Spaces Indent</option>
        <option value="tab">Tab Indent</option>
      </select>
      <button class="btn btn-primary" id="btn-json-format">Prettify JSON</button>
      <button class="btn btn-secondary" id="btn-json-minify">Minify</button>
      <button class="btn btn-secondary" id="btn-json-validate">Validate</button>
      <button class="btn btn-secondary" id="btn-json-to-csv">Convert to CSV</button>
    `;

    document.getElementById('btn-json-format').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter JSON data first', 'error');
      try {
        const obj = JSON.parse(raw);
        const indentType = document.getElementById('json-indent').value;
        const indent = indentType === 'tab' ? '\t' : parseInt(indentType, 10);
        outputArea.value = JSON.stringify(obj, null, indent);
        outputTitle.textContent = 'Formatted JSON';
        updateStats();
        showToast('JSON Formatted Successfully');
      } catch (err) {
        showToast(`Invalid JSON: ${err.message}`, 'error');
      }
    });

    document.getElementById('btn-json-minify').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter JSON data first', 'error');
      try {
        const obj = JSON.parse(raw);
        outputArea.value = JSON.stringify(obj);
        outputTitle.textContent = 'Minified JSON';
        updateStats();
        showToast('JSON Minified');
      } catch (err) {
        showToast(`Invalid JSON: ${err.message}`, 'error');
      }
    });

    document.getElementById('btn-json-validate').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter JSON data first', 'error');
      try {
        JSON.parse(raw);
        showToast('Valid JSON Syntax! ✓', 'success');
      } catch (err) {
        showToast(`Syntax Error: ${err.message}`, 'error');
      }
    });

    document.getElementById('btn-json-to-csv').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter JSON data first', 'error');
      try {
        let arr = JSON.parse(raw);
        if (!Array.isArray(arr)) {
          if (typeof arr === 'object' && arr !== null) {
            // If top-level is an object with an array property, find it
            const keys = Object.keys(arr);
            const arrayKey = keys.find(k => Array.isArray(arr[k]));
            if (arrayKey) arr = arr[arrayKey];
            else arr = [arr];
          } else {
            return showToast('JSON must be an array of objects to convert to CSV', 'error');
          }
        }

        if (arr.length === 0) return showToast('Empty array cannot be converted', 'error');

        // Extract headers
        const headers = Array.from(new Set(arr.flatMap(item => Object.keys(item))));
        const csvRows = [headers.join(',')];

        for (const item of arr) {
          const row = headers.map(h => {
            let val = item[h] !== undefined ? String(item[h]) : '';
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
              val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          });
          csvRows.push(row.join(','));
        }

        outputArea.value = csvRows.join('\n');
        outputTitle.textContent = 'Converted CSV Output';
        updateStats();
        showToast('Converted JSON to CSV');
      } catch (err) {
        showToast(`Conversion failed: ${err.message}`, 'error');
      }
    });
  }

  // ----------------------------------------------------
  // Tool 2: CSV Logic
  // ----------------------------------------------------
  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    function splitLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      result.push(current.trim());
      return result;
    }

    const headers = splitLine(lines[0]);
    const rows = lines.slice(1).map(splitLine);
    return { headers, rows };
  }

  function renderCsvControls() {
    toolControls.innerHTML = `
      <button class="btn btn-primary" id="btn-csv-to-json">Convert CSV to JSON</button>
      <button class="btn btn-secondary" id="btn-csv-to-sql">Generate SQL INSERTs</button>
      <button class="btn btn-secondary" id="btn-csv-to-markdown">Generate Markdown Table</button>
    `;

    document.getElementById('btn-csv-to-json').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter CSV data', 'error');
      try {
        const { headers, rows } = parseCSV(raw);
        if (headers.length === 0) return showToast('Invalid CSV format', 'error');

        const jsonArray = rows.map(row => {
          const obj = {};
          headers.forEach((h, idx) => {
            const val = row[idx] !== undefined ? row[idx] : '';
            // Auto parse numbers if purely numeric
            if (!isNaN(val) && val !== '') {
              obj[h] = Number(val);
            } else {
              obj[h] = val;
            }
          });
          return obj;
        });

        outputArea.value = JSON.stringify(jsonArray, null, 2);
        outputTitle.textContent = 'Converted JSON Array';
        updateStats();
        showToast('CSV converted to JSON');
      } catch (err) {
        showToast(`CSV Parsing Error: ${err.message}`, 'error');
      }
    });

    document.getElementById('btn-csv-to-sql').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter CSV data', 'error');
      try {
        const { headers, rows } = parseCSV(raw);
        const tableName = 'my_table';
        const cols = headers.join(', ');

        const sqlStatements = rows.map(row => {
          const vals = row.map(v => {
            if (v === '' || v.toUpperCase() === 'NULL') return 'NULL';
            if (!isNaN(v)) return v;
            return `'${v.replace(/'/g, "''")}'`;
          }).join(', ');
          return `INSERT INTO ${tableName} (${cols}) VALUES (${vals});`;
        });

        outputArea.value = sqlStatements.join('\n');
        outputTitle.textContent = 'Generated SQL Inserts';
        updateStats();
        showToast('Generated SQL Statements');
      } catch (err) {
        showToast(`SQL Generation Error: ${err.message}`, 'error');
      }
    });

    document.getElementById('btn-csv-to-markdown').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter CSV data', 'error');
      try {
        const { headers, rows } = parseCSV(raw);
        const headerRow = `| ${headers.join(' | ')} |`;
        const dividerRow = `| ${headers.map(() => '---').join(' | ')} |`;
        const bodyRows = rows.map(r => `| ${r.join(' | ')} |`).join('\n');

        outputArea.value = `${headerRow}\n${dividerRow}\n${bodyRows}`;
        outputTitle.textContent = 'Markdown Table';
        updateStats();
        showToast('Converted to Markdown Table');
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  // ----------------------------------------------------
  // Tool 3: SQL Formatter Logic
  // ----------------------------------------------------
  function formatSQL(sql) {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
      'FULL JOIN', 'JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'UNION ALL', 'UNION',
      'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE'
    ];

    let formatted = sql.replace(/\s+/g, ' ').trim();

    // Regex replace for major clause keywords
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n${kw.toUpperCase()}\n  `);
    });

    // Clean up excessive blank lines and indentations
    const lines = formatted.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => {
        if (keywords.includes(l.toUpperCase())) {
          return l.toUpperCase();
        }
        return '  ' + l;
      });

    return lines.join('\n').trim();
  }

  function renderSqlControls() {
    toolControls.innerHTML = `
      <button class="btn btn-primary" id="btn-sql-format">Prettify SQL</button>
      <button class="btn btn-secondary" id="btn-sql-minify">Minify SQL</button>
    `;

    document.getElementById('btn-sql-format').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter SQL statement', 'error');
      try {
        outputArea.value = formatSQL(raw);
        outputTitle.textContent = 'Formatted SQL';
        updateStats();
        showToast('SQL Formatted');
      } catch (err) {
        showToast(`Formatting Error: ${err.message}`, 'error');
      }
    });

    document.getElementById('btn-sql-minify').addEventListener('click', () => {
      const raw = inputArea.value.trim();
      if (!raw) return showToast('Please enter SQL statement', 'error');
      outputArea.value = raw.replace(/\s+/g, ' ').trim();
      outputTitle.textContent = 'Minified SQL';
      updateStats();
      showToast('SQL Minified');
    });
  }

  // ----------------------------------------------------
  // Tab Switching
  // ----------------------------------------------------
  function switchTab(tool) {
    currentTool = tool;
    tabs.forEach(btn => {
      const isActive = btn.dataset.tool === tool;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    inputTitle.textContent = `Input ${tool.toUpperCase()}`;
    outputTitle.textContent = `Output`;

    if (tool === 'json') renderJsonControls();
    else if (tool === 'csv') renderCsvControls();
    else if (tool === 'sql') renderSqlControls();

    inputArea.value = SAMPLES[tool] || '';
    outputArea.value = '';
    updateStats();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tool));
  });

  // Global Actions
  btnSample.addEventListener('click', () => {
    inputArea.value = SAMPLES[currentTool] || '';
    updateStats();
    showToast(`Loaded ${currentTool.toUpperCase()} sample`);
  });

  btnClear.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    updateStats();
    showToast('Cleared editors');
  });

  btnCopy.addEventListener('click', () => {
    const text = outputArea.value;
    if (!text) return showToast('Nothing to copy', 'error');
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard! ✓');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  });

  btnDownload.addEventListener('click', () => {
    const text = outputArea.value || inputArea.value;
    if (!text) return showToast('Nothing to download', 'error');

    const extMap = { json: 'json', csv: 'csv', sql: 'sql' };
    const ext = extMap[currentTool] || 'txt';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataforge-export-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded .${ext} file`);
  });

  // Initialize on load
  switchTab('json');
})();
