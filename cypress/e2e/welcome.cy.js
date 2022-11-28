
describe('rendering the page', () => {
  it('should render the welcome page', () => {
    cy.visit('/');
    cy.findByText(/Welcome to Hathor Wallet/i)
      .should("have.length", 1);
  });

  it('should only allow clicking the button after accepting terms', () => {
    cy.visit('/');

    // Click
    const buttonLabel = 'Get started'
    cy.findByText(buttonLabel).click();

    // Recipe from: https://glebbahmutov.com/cypress-examples/8.7.0/recipes/form-validation.html
    cy.get('form').then(
      ($form) => expect($form[0].checkValidity()).to.be.false,
    )

    // Agree and click again
    cy.get('#confirmAgree').click();
    cy.findByText(buttonLabel).click();

    // Should be on wallet selection screen
    cy.contains('software');
    cy.contains('hardware');
  })
})
