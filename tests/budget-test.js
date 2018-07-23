import { Selector } from 'testcafe'; // first import testcafe selectors

fixture `Main app tests`// declare the fixture
  .page `http://localhost:8080/build/InfoBase/index-eng.html#budget-measures/budget-measure`;  // specify the start page



const budget_desc_sel = "#app-focus-root > div > div > div.budget-measures > " +
  "div > span > p";

//then create a test and place your code there
test('App boots and loads budget tracker page', async t => {
  await t
    // Use the assertion to check if the actual header text is equal to the expected one
    .expect(Selector(budget_desc_sel).innerText).contains("Presented");
});