
describe('rendering the page', () => {
  it('should render the welcome page', () => {
    cy.visit('/');
    cy.findByText(/Welcome to Hathor Wallet/i)
      .should("have.length", 1);
  })
})
