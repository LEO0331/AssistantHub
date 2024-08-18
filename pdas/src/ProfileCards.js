function ProfileCards(props) {
    const {name, email, phone} = props;
    return(
        <div className="profile-card">
            <div>{name}</div>
            <div>{email}</div>
            <div>{phone}</div>
        </div>
    )
}

export default ProfileCards;