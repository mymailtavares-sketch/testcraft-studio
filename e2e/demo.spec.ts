import {test,expect} from "@playwright/test";
test("fluxo demo completo sem pedidos externos",async({page})=>{
 const external:string[]=[];page.on("request",request=>{if(new URL(request.url()).origin!=="http://127.0.0.1:5198")external.push(request.url());});
 await page.goto("/");await expect(page.getByRole("note")).toContainText("gravações simuladas");
 await page.getByRole("button",{name:"Importar US",exact:true}).click();await page.getByLabel("Número da User Story").fill("1001");await page.locator("main").getByRole("button",{name:"Importar US",exact:true}).click();
 await expect(page.locator(".import-story-card")).toContainText("Carrinho de compras");
 await page.getByRole("button",{name:"Usar resposta de exemplo",exact:true}).click();await page.getByRole("button",{name:"Importar resposta",exact:true}).click();
 await expect(page.locator(".review-card")).toHaveCount(2);
 await page.getByRole("checkbox",{name:"Selecionar todos os casos",exact:true}).check();await page.getByRole("button",{name:"Destino dos selecionados",exact:true}).click();
 await page.getByLabel("Biblioteca de testes *",{exact:true}).selectOption("101");
 await page.getByRole("button",{name:/Smoke tests/}).dblclick();
 await page.getByRole("button",{name:"Confirmar destino",exact:true}).click();
 await page.getByRole("button",{name:"Validar Test Cases",exact:true}).click();await page.getByRole("button",{name:"Gravar",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"Casos de teste gravados",exact:true});await expect(dialog).toBeVisible();await expect(dialog.locator("li")).toHaveCount(2);await expect(dialog.locator("li").first()).toContainText("#9001");await expect(dialog.locator("li").first()).toContainText("Demo Store");
 await dialog.getByRole("button",{name:"Fechar",exact:true}).click();await expect(page.locator(".review-card")).toHaveCount(0);
 await page.getByRole("button",{name:"Dashboard",exact:true}).click();await expect(page.locator(".dashboard-metrics")).toContainText("2");
 await page.screenshot({path:"docs/screenshots/dashboard.png",fullPage:true});expect(external).toEqual([]);
});
test("IDs desconhecidos mostram mensagem e nao ligam a um servico real",async({page})=>{
 await page.goto("/");await page.getByRole("button",{name:"Importar US",exact:true}).click();await page.getByLabel("Número da User Story").fill("9999");await page.locator("main").getByRole("button",{name:"Importar US",exact:true}).click();await expect(page.getByRole("alert")).toContainText("1001 ou 1002");
});
