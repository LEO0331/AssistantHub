function ProfileCards(props) {
    const {name, email, imageUrl, cell, description, id} = props;
    return(
      <div className="card">
        <div className="card-content">
          <div className="media">
            <div className="media-left">
              <figure className="image is-72x72">
              <img alt={imageUrl} src={imageUrl} />
              </figure>
            </div>
            <div className="media-content">
              <p className="title is-2">{name}</p>
              <p className="subtitle is-4">{`@${id}`}</p>
            </div>
          </div>
      
          <div className="content">
            Please contact me at <strong>{email}</strong> or <strong>{cell}</strong> at any time!
            <br />
            <div>{description}</div>
          </div>
        </div>
      </div>
    )
}

export default ProfileCards;
