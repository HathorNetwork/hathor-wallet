function setTermsAccepted() {
  cy.session('localStorage', () => {
    localStorage.setItem('localstorage:started', 'true');
  })
}

describe('rendering the page', () => {
  it('should render the welcome page', () => {
    cy.clearLocalStorage();
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

  it('should not display the welcome screen after accepting terms', () => {
    setTermsAccepted();
    cy.visit('/');

    cy.findByText(/Welcome to Hathor Wallet/i)
      .should("have.length", 0);

    // Should be on wallet selection screen
    cy.contains('software');
    cy.contains('hardware');
  })

  it('should require check confirm before starting a software wallet', () => {
    setTermsAccepted();
    cy.visit('/');
    cy.findByText('Software wallet').click();

    // Should be on software wallet warning screen
    cy.contains('Using a software wallet is not the safest way');
    const continueButton = 'Continue';
    cy.findByText(continueButton).click();
    cy.get('form').then(
      ($form) => expect($form[0].checkValidity()).to.be.false,
    )

    // Agree and click again
    cy.get('#confirmWallet').click();
    cy.findByText(continueButton).click();

    cy.contains('You can start a new wallet or import data');
  })
})
