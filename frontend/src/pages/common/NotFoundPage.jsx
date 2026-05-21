import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="card">
      <h2>Sayfa bulunamadi</h2>
      <p>Istediginiz adrese ulasilamadi.</p>
      <Link className="btn btn-secondary" to="/">
        Ana sayfaya don
      </Link>
    </section>
  );
}

export default NotFoundPage;

