(() => {
    'use strict';
    const baseUrl = new URL('.', document.currentScript.src);
    const scripts = new Map();
    const attachmentName = 'boundary-club-roster.json';
    const roles = new Map([
        ['batsman', 'Batsman'], ['batter', 'Batsman'], ['bat', 'Batsman'],
        ['wicketkeeper', 'Wicket Keeper'], ['wk', 'Wicket Keeper'],
        ['allrounder', 'Allrounder'], ['ar', 'Allrounder'],
        ['fastbowler', 'Fast Bowler'], ['pacer', 'Fast Bowler'], ['pacebowler', 'Fast Bowler'],
        ['spinner', 'Spinner'], ['spinbowler', 'Spinner']
    ]);
    const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ');
    const compact = value => normalize(value).toLowerCase().replace(/[\s_-]/g, '');
    const key = player => [normalize(player.name), normalize(player.country)].join('\u0000').toLowerCase();
    const money = lakhs => Number(lakhs) >= 100 ? (Number(lakhs) / 100).toLocaleString('en-IN', {maximumFractionDigits: 2}) + ' Cr' : Number(lakhs).toLocaleString('en-IN') + ' L';
    const icon = path => '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7"><path d="' + path + '"/></svg>';

    function loadScript(name) {
        if (!scripts.has(name)) scripts.set(name, new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = new URL('vendor/' + name, baseUrl);
            script.onload = resolve;
            script.onerror = () => {
                scripts.delete(name);
                script.remove();
                reject(new Error('The local PDF component could not be loaded. Reload the app and try again.'));
            };
            document.head.append(script);
        }));
        return scripts.get(name);
    }

    async function makeDocument(title) {
        await loadScript('pdf-lib.min.js');
        const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
        const doc = await PDFDocument.create();
        doc.setTitle('Boundary Club | ' + title);
        doc.setAuthor('Boundary Club');
        const [normal, bold, display] = await Promise.all([StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.TimesRomanBold].map(font => doc.embedFont(font)));
        const color = hex => rgb(...hex.match(/../g).map(c => parseInt(c, 16) / 255));
        const ink = color('15342d'), green = color('17483b'), muted = color('53665e'), line = color('d8e0d8'), pale = color('f1f5ee'), white = rgb(1, 1, 1);
        const width = 595, height = 842, left = 38, span = width - 2 * left;
        let page, cursor;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        function fontStyle(font, size) {
            return (font === normal ? '' : 'bold ') + size + 'px ' + (font === display ? 'Georgia, "Nirmala UI", serif' : 'Arial, "Nirmala UI", sans-serif');
        }
        function measure(value, font, size) {
            try { return font.widthOfTextAtSize(value, size); }
            catch { ctx.font = fontStyle(font, size); return ctx.measureText(value).width; }
        }
        async function write(value, x, top, size = 10, font = normal, shade = ink) {
            const text = normalize(value);
            if (!text) return;
            try { font.encodeText(text); }
            catch {
                const scale = 3, fontSize = size * scale;
                ctx.font = fontStyle(font, fontSize);
                canvas.width = Math.ceil(ctx.measureText(text).width) + 6;
                canvas.height = Math.ceil(fontSize * 1.8);
                ctx.font = fontStyle(font, fontSize);
                ctx.fillStyle = 'rgb(' + [shade.red, shade.green, shade.blue].map(v => Math.round(v * 255)).join(',') + ')';
                ctx.fillText(text, 0, fontSize);
                const image = await doc.embedPng(canvas.toDataURL('image/png'));
                page.drawImage(image, { x, y: height - top - canvas.height / scale + size, width: canvas.width / scale, height: canvas.height / scale });
                return;
            }
            page.drawText(text, {x, y: height - top, size, font, color: shade});
        }
        function rect(x, top, w, h, shade) {
            page.drawRectangle({ x, y: height - top - h, width: w, height: h, color: shade });
        }
        function wrap(value, font, size, max) {
            const lines = [''];
            for (const word of normalize(value).split(' ')) {
                let last = lines.length - 1;
                const joined = [lines[last], word].filter(Boolean).join(' ');
                if (measure(joined, font, size) <= max) { lines[last] = joined; continue; }
                if (lines[last]) lines.push('');
                for (const char of word) {
                    last = lines.length - 1;
                    if (lines[last] && measure(lines[last] + char, font, size) > max) lines.push(char);
                    else lines[last] += char;
                }
            }
            return lines;
        }
        async function newPage() {
            page = doc.addPage([width, height]);
            rect(0, 0, width, 6, green);
            await write('BOUNDARY CLUB', left, 34, 10, bold, green);
            const stamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month:'short', year:'numeric' }).toUpperCase();
            await write(stamp, width - left - measure(stamp, normal, 9), 34, 9, normal, muted);
            rect(left, 47, span, 0.8, line);
            cursor = 70;
        }
        async function heading(kicker, text, subtitle) {
            await newPage();
            await write(kicker.toUpperCase(), left, cursor, 9, bold, green);
            cursor += 39;
            for (const part of wrap(text, display, 34, span)) {
                await write(part, left, cursor, 34, display);
                cursor += 38;
            }
            cursor -= 16;
            if (subtitle) {
                for (const part of wrap(subtitle, normal, 10, span)) {
                    await write(part, left, cursor, 10, normal, muted);
                    cursor += 15;
                }
            }
            cursor += 10;
        }
        async function metrics(items) {
            const cell = span / items.length;
            rect(left, cursor, span, 53, green);
            for (let i = 0; i < items.length; i++) {
                const x = left + i * cell + 13;
                await write(items[i][0].toUpperCase(), x, cursor + 17, 8, bold, color('cde6c8'));
                await write(items[i][1], x, cursor + 39, 18, bold, white);
            }
            cursor += 69;
        }
        async function table(headers, rows, widths, context) {
            async function header() {
                rect(left, cursor, span, 25, pale);
                let x = left;
                for (let i = 0; i < headers.length; i++) {
                    await write(headers[i], x + 5, cursor + 16, 9, bold, green);
                    x += widths[i];
                }
                cursor += 25;
            }
            await header();
            for (const row of rows) {
                const cells = row.map((item, index) => wrap(item, index === 0 ? bold : normal, 10, widths[index] - 10));
                const rowHeight = Math.max(...cells.map(c => c.length)) * 13 + 12;
                if (cursor + rowHeight > height - 60) {
                    await newPage();
                    for (const part of wrap(context, bold, 13, span)) {
                        await write(part, left, cursor, 13, bold);
                        cursor += 18;
                    }
                    await header();
                }
                let x = left;
                for (let i = 0; i < cells.length; i++) {
                    for (let j = 0; j < cells[i].length; j++) {
                        await write(cells[i][j], x + 5, cursor + 16 + 13 * j, 10, i === 0 ? bold : normal);
                    }
                    x += widths[i];
                }
                cursor += rowHeight;
                rect(left, cursor - 1, span, 0.55, line);
            }
        }
        async function section(title) {
            if (cursor > height - 160) await newPage();
            cursor += 34;
            await write(title, left, cursor, 20, display);
            cursor += 13;
        }
        async function finish(filename) {
            const pages = doc.getPages();
            for (let i = 0; i < pages.length; i++) {
                page = pages[i];
                rect(left, height - 42, span, 0.8, line);
                await write(title, left, height - 25, 9, normal, muted);
                const number = (i + 1) + ' / ' + pages.length;
                await write(number, width - left - measure(number, bold, 9), height - 25, 9, bold, green);
            }
            const blob = new Blob([await doc.save()], {type:'application/pdf'});
            const url = URL.createObjectURL(blob), link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
        return { doc, heading, metrics, table, section, finish };
    }

    async function exportReport() {
        try {
            const teams = structuredClone(appState.teams);
            const players = teams.flatMap(team => team.squad);
            const spend = squad => squad.reduce((sum, p) => sum + Number(p.sellingPrice || 0), 0);
            const unsold = Object.values(appState.playerPools).flat().filter(p => p.status === 'passed-over').map(p => ({...p}));
            const state = appState.auctionEnded ? 'Final scorecard' : 'Auction snapshot';
            const book = await makeDocument('Auction report');
            await book.heading(state, 'Auction report', 'Franchise balances and squad acquisitions. All prices are in Indian rupees.');
            await book.metrics([['Franchises', teams.length], ['Squad places filled', players.length], ['Total spent', money(spend(players))]]);
            await book.table(['Franchise','Squad','Spent','Remaining'], teams.map(t => [t.name, t.squad.length, money(spend(t.squad)), money(t.purse)]), [208,65,123,123], 'Franchise standings');
            const topBuys = teams.flatMap(team => team.squad.filter(p => p.status !== 'retained').map(p => ({player:p, team:team.name})))
                .sort((a, b) => b.player.sellingPrice - a.player.sellingPrice).slice(0, 5);
            if (topBuys.length) {
                await book.section('Highest auction buys');
                await book.table(['Player','Franchise','Role','Price'], topBuys.map(({player,team}) => [player.name,team,player.category,money(player.sellingPrice)]), [164,153,124,78], 'Highest auction buys');
            }
            for (const team of teams.filter(t => t.squad.length)) {
                await book.heading('Franchise squad', team.name, team.squad.length + (team.squad.length === 1 ? ' player' : ' players') + '  /  ' + money(spend(team.squad)) + ' spent  /  ' + money(team.purse) + ' available');
                await book.table(['Player','Role','Country','Price','Acquired'], team.squad.map(p => [p.name, p.category, p.country, money(p.sellingPrice), p.status === 'retained' ? 'Retained' : 'Auction']), [151,109,112,76,71], team.name + ' - squad');
            }
            if (unsold.length) {
                await book.heading('Auction floor', 'Unsold players', unsold.length + ' passed-over players eligible for review.');
                await book.table(['Player','Role','Country','Base (lakhs)'], unsold.map(p => [p.name,p.category,p.country,p.basePrice]), [171,131,123,94], 'Unsold players');
            }
            await book.finish('boundary-club-auction-report.pdf');
            showToast('Auction PDF downloaded', 'success');
        } catch (e) { showToast('PDF export failed. ' + e.message, 'error'); }
    }

    async function exportRoster() {
        try {
            const players = structuredClone(appState.masterPlayerList);
            const book = await makeDocument('Player roster');
            await book.heading('Auction registration', 'Player roster', players.length + ' registered players. Base prices are in INR lakhs.');
            await book.table(['Player','Role','Country','Base (lakhs)'], players.map(p => [p.name,p.category,p.country,p.basePrice]), [171,131,123,94], 'Player roster');
            const data = new TextEncoder().encode(JSON.stringify({ version: 1, players }));
            await book.doc.attach(data, attachmentName, { mimeType:'application/json', description:'Player registration data for Boundary Club' });
            await book.finish('boundary-club-player-roster.pdf');
            showToast('Player roster PDF downloaded', 'success');
        } catch (e) { showToast('PDF export failed. ' + e.message, 'error'); }
    }

    function headerKey(value) {
        const word = normalize(value).toLowerCase();
        if (/^(player( name)?|name|cricketer)$/.test(word)) return 'name';
        if (/^(role|category|speciali[sz]ation|player role)$/.test(word)) return 'category';
        if (/^(country|nation|nationality)$/.test(word)) return 'country';
        if (/^(base\b|reserve\b|price\b)/.test(word) && !/\b(cr|crores?|millions?|usd)\b/.test(word)) return 'basePrice';
        return null;
    }

    function pageRows(items) {
        const ordered = items.filter(item => normalize(item.str)).map(item => ({
            text: normalize(item.str), x: item.transform[4], y: item.transform[5], height: Math.abs(item.height) || 11
        })).sort((a, b) => b.y - a.y || a.x - b.x);
        const rows = [];
        for (const item of ordered) {
            let row = rows[rows.length - 1];
            if (!row || Math.abs(item.y - row.y) > Math.min(4, item.height * 0.35)) {
                row = {y:item.y, items:[]};
                rows.push(row);
            }
            row.items.push(item);
        }
        return rows.map(row => row.items.sort((a, b) => a.x - b.x));
    }

    function detectHeader(row) {
        const columns = [];
        for (const part of row) {
            const field = headerKey(part.text);
            if (field && !columns.some(c => c.field === field)) columns.push({ field, x:part.x });
        }
        return columns.length === 4 ? columns : null;
    }

    function playerFromRow(row, columns) {
        const values = {};
        for (const item of row) {
            const col = columns.findLast(col => item.x >= col.x - 5) || columns[0];
            values[col.field] = normalize([values[col.field],item.text].filter(Boolean).join(' '));
        }
        return values;
    }

    async function readRoster(file) {
        if (file.size > 16 * 1024 * 1024) throw new Error('Choose a PDF smaller than 16 MB.');
        await loadScript('pdf.worker.min.js');
        await loadScript('pdf.min.js');
        const task = window.pdfjsLib.getDocument({ data:new Uint8Array(await file.arrayBuffer()), isEvalSupported:false, useSystemFonts:true, useWasm:false, verbosity:0 });
        try {
            const pdf = await task.promise;
            if (pdf.numPages > 150) throw new Error('Split the roster into files of 150 pages or fewer.');
            const attachment = (await pdf.getAttachments())?.[attachmentName];
            if (attachment) {
                if (attachment.content.byteLength > 6 * 1024 * 1024) throw new Error('The embedded roster is too large.');
                const data = JSON.parse(new TextDecoder().decode(attachment.content));
                if (data.version !== 1 || !Array.isArray(data.players)) throw new Error('The embedded roster format is unsupported.');
                return data.players;
            }
            const rows = [];
            let columns = null, foundHeader = false, hasText = false;
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                const page = await pdf.getPage(pageNumber);
                const content = await page.getTextContent();
                for (const row of pageRows(content.items)) {
                    hasText = true;
                    const header = detectHeader(row);
                    if (header) { columns = header; foundHeader = true; continue; }
                    if (!columns) continue;
                    const player = playerFromRow(row, columns);
                    if (Object.keys(player).length >= 2) rows.push(player);
                }
                page.cleanup();
            }
            if (!hasText) throw new Error('This PDF has no selectable text. Run OCR or export the original spreadsheet as a PDF.');
            if (!foundHeader) throw new Error('Use a text table with separate Player, Role, Country and Base (lakhs) columns. Roster PDF provides an example.');
            return rows;
        } catch (error) {
            if (error.name === 'PasswordException') throw new Error('Unlock the PDF before importing its roster.');
            throw error;
        } finally {
            await task.destroy();
        }
    }

    function validate(rows) {
        if (!Array.isArray(rows) || rows.length > 10000) throw new Error('Import up to 10,000 roster rows at a time.');
        const players = [], rejected = [], seen = new Set();
        for (const row of rows) {
            const name = normalize(row?.name), country = normalize(row?.country), category = roles.get(compact(row?.category));
            const raw = normalize(row?.basePrice).replace(/^(?:INR|Rs\.?|₹)\s*/i, '').replace(/\s*(?:L|lakh[s]?)$/i, '');
            const basePrice = /^\d+$/.test(raw) ? Number(raw) : NaN;
            const player = { name, category, country, basePrice };
            if (!name || !country || name.length > 180 || country.length > 100 || !category || !Number.isSafeInteger(basePrice) || basePrice < 1) {
                rejected.push((name || 'Unnamed row') + ' — check name, role, country and whole-lakh base price');
                continue;
            }
            if (seen.has(key(player))) { rejected.push(name + ' — repeated in file'); continue; }
            if (typeof row.photo === 'string' && /^https?:\/\//i.test(row.photo)) player.photo = row.photo;
            seen.add(key(player));
            players.push(player);
        }
        return { players, rejected };
    }

    function openImport() {
        const dialog = document.createElement('dialog');
        dialog.className = 'bc-pdf-review';
        dialog.setAttribute('aria-labelledby','pdf-review-title');
        dialog.innerHTML = '<h2 id="pdf-review-title">Import player roster</h2><p>Choose a text-based PDF with Player, Role, Country and Base (lakhs) columns, or a Boundary Club roster PDF.</p><label class="bc-pdf-file">Roster file<input type="file" accept=".pdf,application/pdf"></label><p class="bc-pdf-status" role="status"></p><div class="bc-pdf-controls" hidden><label>Import mode<select><option value="add">Add new players</option><option value="replace">Replace player database</option></select></label><div class="bc-pdf-scroll"><table><thead><tr><th>Player</th><th>Role</th><th>Country</th><th>Base (L)</th></tr></thead><tbody></tbody></table></div><details hidden><summary>Skipped rows</summary><ul></ul></details></div><div class="bc-pdf-actions"><button type="button" data-close>Cancel</button><button type="button" data-apply disabled>Import players</button></div>';
        document.body.append(dialog);
        const input = dialog.querySelector('input'), mode = dialog.querySelector('select'), status = dialog.querySelector('[role=status]'), apply = dialog.querySelector('[data-apply]'), controls = dialog.querySelector('.bc-pdf-controls');
        let preview, selected = [], generation = 0;
        function renderPreview() {
            const existing = new Set(appState.masterPlayerList.map(key));
            const skipped = [...preview.rejected];
            selected = preview.players.filter(p => {
                if (mode.value === 'replace' || !existing.has(key(p))) return true;
                skipped.push(p.name + ' — already in database');
                return false;
            });
            status.textContent = mode.value === 'replace'
                ? 'Replace all ' + appState.masterPlayerList.length + ' existing entries with ' + selected.length + ' players. ' + skipped.length + ' rows skipped.'
                : selected.length + ' new players ready to add. ' + skipped.length + ' rows skipped.';
            apply.textContent = mode.value === 'replace' ? 'Replace database' : 'Add players';
            apply.disabled = !selected.length;
            const body = dialog.querySelector('tbody');
            body.replaceChildren();
            for (const p of selected) {
                const tr = document.createElement('tr');
                for (const value of [p.name,p.category,p.country,p.basePrice]) tr.insertCell().textContent = String(value);
                body.append(tr);
            }
            const details = dialog.querySelector('details'), list = details.querySelector('ul');
            details.hidden = !skipped.length;
            list.replaceChildren();
            for (const reason of skipped) {
                const li = document.createElement('li');
                li.textContent = reason;
                list.append(li);
            }
            controls.hidden = false;
        }
        input.addEventListener('change', async () => {
            const current = ++generation;
            apply.disabled = true;
            preview = null;
            selected = [];
            controls.hidden = true;
            mode.value = 'add';
            const file = input.files[0];
            if (!file) { status.textContent = ''; return; }
            status.textContent = 'Reading ' + file.name + '…';
            try {
                const result = validate(await readRoster(file));
                if (current !== generation || !dialog.open) return;
                if (!result.players.length && !result.rejected.length) throw new Error('No player rows found in this PDF.');
                preview = result;
                renderPreview();
            } catch (err) {
                if (current === generation) status.textContent = err.message;
            }
        });
        mode.addEventListener('change', renderPreview);
        apply.addEventListener('click', () => {
            if (!selected.length || !preview) return;
            if (appState.auctionStarted && !appState.auctionEnded) { status.textContent = 'Finish the active auction before changing its player database.'; return; }
            const existing = appState.masterPlayerList;
            appState.masterPlayerList = mode.value === 'replace' ? selected : [...existing,...selected];
            try { savePlayerDatabase(); }
            catch { appState.masterPlayerList = existing; status.textContent = 'Could not save these players. Your browser storage may be full.'; return; }
            document.getElementById('playerEditorForm').classList.add('hidden');
            renderEditList();
            refreshSetupSummary();
            showToast(selected.length + ' players imported', 'success');
            dialog.close();
        });
        dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => { generation++; dialog.remove(); }, {once:true});
        dialog.showModal();
    }

    function install() {
        const csv = document.getElementById('importPlayersCsvBtn');
        if (!csv) return;
        const style = document.createElement('style');
        style.textContent = `
            .bc-pdf-toolbar{flex-wrap:wrap}
            .bc-pdf-tool{display:inline-flex;gap:6px;align-items:center;white-space:nowrap}
            .bc-pdf-review{box-sizing:border-box;width:min(620px,calc(100% - 24px));max-height:88dvh;overflow:auto;margin:auto;padding:24px;border:1px solid var(--line,#aebfb3);border-radius:16px;background:var(--card,#fff);color:var(--ink,#163b2d);box-shadow:0 20px 90px #0005;font:14px/1.5 system-ui}
            .bc-pdf-review::backdrop{background:#06231ec9}
            .bc-pdf-review h2{font:700 26px/1.15 var(--display,Georgia);margin:0 0 9px}
            .bc-pdf-review p{margin:6px 0 16px}.bc-pdf-review [hidden]{display:none!important}
            .bc-pdf-review label{display:grid;gap:5px;font-weight:650;margin:14px 0}
            .bc-pdf-review input,.bc-pdf-review select{color:inherit;background:var(--paper,#f4f7f1);border:1px solid var(--line,#ccd8ce);padding:8px;border-radius:7px;width:100%;font:inherit}
            .bc-pdf-review .bc-pdf-status{font-weight:650}.bc-pdf-review table{width:100%;font-size:13px;text-align:left}.bc-pdf-review th,.bc-pdf-review td{border-bottom:1px solid var(--line,#ccd8ce);padding:6px 8px}.bc-pdf-review th{position:sticky;top:0;background:var(--card,#fff)}
            .bc-pdf-scroll,.bc-pdf-review details ul{max-height:25vh;overflow:auto}.bc-pdf-review details{margin-top:10px}
            .bc-pdf-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.bc-pdf-actions button{padding:8px 14px;border:1px solid var(--line,#ccd8ce);border-radius:8px;font-weight:650;color:inherit}
            .bc-pdf-actions [data-apply]{background:#18533f;color:white;border-color:transparent}.bc-pdf-actions button:disabled{opacity:.45}
        `;
        document.head.append(style);
        const toolbar = csv.parentElement;
        toolbar.classList.add('bc-pdf-toolbar');
        for (const [id,label,path,handler] of [
            ['exportPlayersPdfBtn','Roster PDF','M14 3H6v18h12V7z M14 3v5h5 M9 13h6 M9 16h5',exportRoster],
            ['importPlayersPdfBtn','Import PDF','M12 15V3m-4 4 4-4 4 4 M5 14v6h14v-6',openImport]
        ]) {
            const button = document.createElement('button');
            button.id = id;
            button.type = 'button';
            button.className = csv.className + ' bc-pdf-tool';
            button.innerHTML = icon(path);
            button.append(document.createTextNode(label));
            button.addEventListener('click',handler);
            toolbar.append(button);
        }
    }

    window.AuctionPdf = { exportReport, exportRoster, openImport };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
})();
