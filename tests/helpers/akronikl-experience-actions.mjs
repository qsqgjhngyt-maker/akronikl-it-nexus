// Только команды нового UI. Проверки Account/Store/SW остаются в вызывающих тестах.
export const experience=page=>page.locator('[data-akronikl-panel]');
export async function command(page,text){const p=experience(page);await p.locator('[data-akronikl-message]').fill(text);await p.locator('[data-akronikl-send]').click();await p.locator('.ak-composer[aria-busy="false"]').waitFor();}
export async function showSettings(page,section='privacy'){const p=experience(page);if(await p.locator('#ak-chat-settings').isHidden())await p.locator('[data-akronikl-settings]').click();await p.locator(`[aria-controls="ak-settings-${section}"]`).click();}
export async function leaveSettings(page){const p=experience(page);if(await p.locator('#ak-chat-settings').isVisible())await p.locator('.ak-back').click();}
export async function enableSelection(page,value=true){await showSettings(page);await experience(page).locator('[data-ak-code-consent]').setChecked(value);await leaveSettings(page);}
export async function revealSources(page){const p=experience(page);for(const detail of await p.locator('.ak-sources').all()){if(!await detail.evaluate(n=>n.open))await detail.locator(':scope > summary').click();}}
export async function findMaterials(page,query='указатели'){await command(page,`find ${query}`);await revealSources(page);await experience(page).locator('.ak-assistant').last().locator('.ak-source').first().waitFor();}
export async function showContext(page){await command(page,'Покажи контекст');}
