import { Selector } from 'testcafe'; // first import testcafe selectors

fixture `Main app tests`// declare the fixture
  .page `http://localhost:8080/build/InfoBase/index-eng.html#explore-dept`;  // specify the start page



const explore_desc_sel = "#app-focus-root > div > div > div >" +
"div > div.common_content.mrgn-bttm-md > div.row > div.col-sm-12.col-md-12 > div.explore_description ";


//then create a test and place your code there
test('App boots and loads explore dept page', async t => {
  await t
    // Use the assertion to check if the actual header text is equal to the expected one
    .expect(Selector(explore_desc_sel).innerText).contains("perspectives");
});