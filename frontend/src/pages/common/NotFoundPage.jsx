import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="card">
      <h2>Page not found</h2>
      <p>The page you requested could not be found.</p>
      <Link className="btn btn-secondary" to="/">
        Back to home
      </Link>
    </section>
  );
}

export default NotFoundPage;
