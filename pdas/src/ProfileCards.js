/* eslint-disable react/prop-types */
/* eslint-disable react/react-in-jsx-scope */
function ProfileCards(props) {
    const {name, email, imageUrl, cell, description, id, likes, onLikeClick} = props;

    return(
      <div className="card">
        <div className="card-content">
          <div className="media">
            <div className="media-left">
              <figure className="image is-72x72">
                <img alt="images" src={imageUrl} />
              </figure>
            </div>
            <div className="media-content">
              <p className="title is-2">{name}</p>
              <p className="subtitle is-4">{`@${id}`}</p>
              <p className="subtitle">
                <span className="icon" onClick={onLikeClick}>
                  <i className="fa fa-thumbs-up" aria-hidden="true"></i> 
                </span>
                {likes} {likes === 0 ? 'Like' : likes === 1 ? 'Like' : 'Likes'}
              </p>
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
