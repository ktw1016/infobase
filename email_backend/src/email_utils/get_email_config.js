const get_email_config = () => ({
  from: (
    process.env.IS_PROD_SERVER ?
      process.env.EMAIL_BACKEND_SENDING_ADDRESS : 
      "Sender Name <sender@example.com>"
  ),
  to: (
    process.env.IS_PROD_SERVER ?
      process.env.EMAIL_BACKEND_RECEIVING_ADDRESS : 
      "Recipient <recipient@example.com>"
  ),
});

export { get_email_config };