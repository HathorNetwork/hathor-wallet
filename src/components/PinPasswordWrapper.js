import React from 'react';


class PinPasswordWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      errorMessage: '',
    }
  }

  next = () => {
    const isValid = this.refs.passwordForm.checkValidity();
    if (isValid) {
      this.refs.passwordForm.classList.remove('was-validated')
      const password = this.refs.password.value;
      const confirmPassword = this.refs.confirmPassword.value;
      if (password !== confirmPassword) {
        this.setState({ errorMessage: 'Both fields must be equal' });
      } else {
        this.props.success();
      }
    } else {
      this.refs.passwordForm.classList.add('was-validated')
    }
  }

  render() {
    return (
      <div className="d-flex align-items-start flex-column">
        {this.props.message}
        <form ref="passwordForm" className="w-100">
          <input required ref="password" type="password" pattern={this.props.pattern} inputMode={this.props.inputMode} autoComplete="off" placeholder={this.props.field} className="form-control" onChange={(e) => {this.props.handleChange(e.target.value)}}/>
          <input required ref="confirmPassword" type="password" pattern={this.props.pattern} inputMode={this.props.inputMode} autoComplete="off" placeholder={`Confirm ${this.props.field}`} className="form-control mt-4 mb-4" />
        </form>
        {this.state.errorMessage && <p className="mb-4 text-danger">{this.state.errorMessage}</p>}
        <div className="d-flex justify-content-between flex-row w-100">
          <button onClick={this.props.back} type="button" className="btn btn-secondary">Back</button>
          <button onClick={this.next} type="button" className="btn btn-hathor">{this.props.button}</button>
        </div>
      </div>
    )
  }
}

export default PinPasswordWrapper;
